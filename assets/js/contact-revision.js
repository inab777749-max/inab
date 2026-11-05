/* Social destinations are explicit site settings. Never infer a creator URL
   from a collaborator's link or make up a username/invite code. */
(() => {
  'use strict';
  const destinations = {
    artmug: { key: 'social_artmug_url', hosts: ['artmug.kr', 'www.artmug.kr'] },
    x: { key: 'social_x_url', hosts: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'] },
    discord: { key: 'social_discord_url', hosts: ['discord.gg', 'www.discord.gg', 'discord.com', 'www.discord.com', 'discordapp.com'] }
  };
  function applySocial(event) {
    const content = window.SITE_CONTENT || (event && event.detail) || {};
    document.querySelectorAll('[data-social-link]').forEach((link) => {
      const spec = destinations[link.dataset.socialLink];
      if (!spec) return;
      let url = null;
      try {
        const parsed = new URL(String(content[spec.key] || '').trim());
        if (parsed.protocol === 'https:' && spec.hosts.includes(parsed.hostname.toLowerCase()) && !parsed.username && !parsed.password) url = parsed.href;
      } catch (_) { /* Unconfigured links stay explicitly unavailable. */ }
      if (url) { link.href = url; link.removeAttribute('aria-disabled'); link.tabIndex = 0; }
      else { link.removeAttribute('href'); link.setAttribute('aria-disabled', 'true'); link.tabIndex = -1; }
    });
  }
  document.addEventListener('content:ready', applySocial);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applySocial, { once: true });
  else applySocial();
})();
