use std::{fs, io::{Read, Seek, SeekFrom}, path::Path, time::Instant};
use anyhow::Result;
use hakutaku_core::{Asset, AssetCursor, OpenPolicy, Package, ResourceBudget};
use hakutaku_pack::{Identity, PackOptions, pack_directory};
use serde_json::json;

type Files = Vec<(String, Vec<u8>)>;
const PASSWORD: &str = "benchmark-only-not-a-secret";
const CACHE_BYTES: usize = 64 * 1024 * 1024;

fn fixture(dir: &Path) -> Result<Files> {
    let mut result = Vec::new();
    for (group, count, bytes, text) in [("scenario",256,8192,true),("background",48,262144,false),("voice",192,65536,false),("ui",128,16384,true)] {
        fs::create_dir_all(dir.join(group))?;
        for i in 0..count {
            let name = format!("{group}/{i:04}.bin");
            let mut seed = (i + 1) as u64 * 0x9e3779b9;
            let line = b"scene: benchmark text;\n";
            let data = (0..bytes).map(|j| if text { line[j % line.len()] } else {
                seed ^= seed << 13; seed ^= seed >> 7; seed ^= seed << 17; seed as u8
            }).collect::<Vec<_>>();
            fs::write(dir.join(&name), &data)?;
            result.push((name, data));
        }
    }
    Ok(result)
}
fn bytes(path: &Path) -> Result<u64> {
    if path.is_file() { return Ok(fs::metadata(path)?.len()); }
    fs::read_dir(path)?.try_fold(0, |sum, entry| Ok(sum + bytes(&entry?.path())?))
}
trait Session {
    fn full(&mut self, index: usize) -> Result<Vec<u8>>;
    fn range(&mut self, index: usize, offset: usize, buffer: &mut [u8]) -> Result<()>;
}
struct HexzSession(Vec<hexz_k::ResourceFile>);
impl Session for HexzSession {
    fn full(&mut self, index: usize) -> Result<Vec<u8>> { self.0[index].read() }
    fn range(&mut self, index: usize, offset: usize, buffer: &mut [u8]) -> Result<()> {
        anyhow::ensure!(self.0[index].read_range_into(offset, buffer)? == buffer.len()); Ok(())
    }
}
struct HakuSession { assets: Vec<Asset>, cursors: Vec<AssetCursor> }
impl Session for HakuSession {
    fn full(&mut self, index: usize) -> Result<Vec<u8>> { Ok(self.assets[index].read()?) }
    fn range(&mut self, index: usize, offset: usize, buffer: &mut [u8]) -> Result<()> {
        self.cursors[index].seek(SeekFrom::Start(offset as u64))?;
        self.cursors[index].read_exact(buffer)?; Ok(())
    }
}
fn trajectory(files: &Files) -> Vec<(usize, usize)> {
    (0usize..2000).map(|i| {
        let index = i.wrapping_mul(2654435761) % files.len();
        (index, i.wrapping_mul(11400714819323198485) % (files[index].1.len() - 4096 + 1))
    }).collect()
}
fn ranges(session: &mut impl Session, trace: &[(usize, usize)], buffer: &mut [u8]) -> Result<()> {
    for &(index, offset) in trace {
        session.range(index, offset, buffer)?;
        std::hint::black_box(&*buffer);
    }
    Ok(())
}
fn measure<S: Session>(open: impl Fn() -> Result<S>, files: &Files) -> Result<serde_json::Value> {
    let trace = trajectory(files);
    let mut buffer = [0u8; 4096];
    // Validate outside timing; warm the filesystem, then discard every reader/cache.
    {
        let mut session = open()?;
        for (i, (_, expected)) in files.iter().enumerate() { anyhow::ensure!(session.full(i)? == *expected); }
        for &(i, offset) in &trace {
            session.range(i, offset, &mut buffer)?;
            anyhow::ensure!(buffer == files[i].1[offset..offset + 4096]);
        }
    }
    let mut sequential = Vec::new();
    let mut fresh = Vec::new();
    for _ in 0..10 {
        let mut session = open()?; // KDF, indexes and handle resolution outside the clock.
        let start = Instant::now();
        for i in 0..files.len() { std::hint::black_box(session.full(i)?); }
        sequential.push(start.elapsed().as_secs_f64() * 1000.0);
        drop(session);
        let mut session = open()?;
        let start = Instant::now();
        ranges(&mut session, &trace, &mut buffer)?;
        fresh.push(start.elapsed().as_secs_f64() * 1000.0);
    }
    let mut session = open()?;
    ranges(&mut session, &trace, &mut buffer)?; // One identical, explicitly excluded warm-up.
    let mut reused = Vec::new();
    for _ in 0..10 {
        let start = Instant::now();
        ranges(&mut session, &trace, &mut buffer)?;
        reused.push(start.elapsed().as_secs_f64() * 1000.0);
    }
    Ok(json!({"files":files.len(),"raw_bytes":files.iter().map(|(_,v)|v.len()).sum::<usize>(),
        "verified_files":files.len(),"verified_ranges":trace.len(),"encrypted":true,
        "cache_payload_budget_bytes":CACHE_BYTES,"prefetch":false,"reused_warmup_rounds":1,
        "sequential_fresh_ms":sequential,"random_fresh_2000_4k_ms":fresh,"random_reused_2000_4k_ms":reused}))
}
fn main() -> Result<()> {
    let process = std::env::args().nth(1).unwrap_or("1".into()).parse::<usize>()?;
    let tmp = tempfile::tempdir()?;
    let input = tmp.path().join("input");
    let files = fixture(&input)?;
    let mut order = ["hakutaku", "hexz-lz4-encrypted", "hexz-zstd-encrypted"];
    order.rotate_left((process - 1) % 3);
    for (position, id) in order.iter().enumerate() {
        let (mut result, size) = if *id == "hakutaku" {
            let identity = Identity::generate()?;
            let release = tmp.path().join("haku");
            pack_directory(&PackOptions::new(&input, &release), &identity)?;
            let open = || -> Result<HakuSession> {
                let budget = ResourceBudget { plaintext_cache_bytes: CACHE_BYTES, prefetch_cache_bytes: 0, ..ResourceBudget::default() };
                let package = Package::open_directory(release.join("game.haku"), release.join("data"), identity.root_key(), identity.public_key(), budget, OpenPolicy::TrustFirstRelease)?;
                let assets = files.iter().map(|(name,_)|package.asset(name)).collect::<Result<Vec<_>,_>>()?;
                let cursors = assets.iter().map(|asset|asset.cursor()).collect();
                Ok(HakuSession {assets, cursors})
            };
            (measure(open, &files)?, bytes(&release)?)
        } else {
            let codec = if id.contains("lz4") { "lz4" } else { "zstd" };
            let archive = tmp.path().join(format!("{codec}.hxz"));
            hexz_k::cmd::pack::pack_directory(&hexz_k::cmd::pack::PackOptions {
                input: input.to_string_lossy().into(), output: archive.to_string_lossy().into(),
                compression: codec.into(), encrypt: true, block_size: 65536, password: Some(PASSWORD.into())
            })?;
            let open = || -> Result<HexzSession> {
                let options = hexz_k::ResourcePackOptions { cache_capacity_blocks: Some(CACHE_BYTES / 65536), prefetch_window_blocks: None, verify_password_on_open: false };
                let reader = hexz_k::ResourcePack::open_with_options(&archive, Some(PASSWORD), options)?;
                Ok(HexzSession(files.iter().map(|(name,_)|reader.open_file(name)).collect::<Result<Vec<_>>>()?))
            };
            (measure(open, &files)?, bytes(&archive)?)
        };
        result["id"] = json!(id); result["archive_bytes"] = json!(size);
        result["process"] = json!(process); result["position"] = json!(position);
        println!("{result}");
    }
    Ok(())
}
