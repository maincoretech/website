<script>
  import { msg } from '$lib/i18n/index.js';
  import LanguageSwitcher from './LanguageSwitcher.svelte';
  import SearchBox from './SearchBox.svelte';
</script>

<header id="banner" aria-label={$msg('语言与搜索')}>
  <LanguageSwitcher />
  <SearchBox />
</header>
