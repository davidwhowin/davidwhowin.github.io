// Nova Drop — outside links shown in Settings > Extras (store compliance). Unity twin: Scripts/App/AppLinks.cs.
// Privacy policy: Apple 5.1.1(i) wants it reachable inside the app. Report an ad: Apple 2.5.18 wants a way to
// report inappropriate ads (Google's AdChoices panel covers Google-served ads; this email path covers the rest).
// TODO(release): both are placeholders. Host docs/store/privacy.html (free GitHub Pages, see
// docs/store/LISTING.md section 8) and create the dedicated support address, then fill these in (and in AppLinks.cs).
export const APP_LINKS = {
  privacyPolicyUrl: 'https://davidwhowin.github.io/privacy.html',
  contactEmail: 'playnovadrop@gmail.com',
};

export const isPlaceholderLink = (v) => !v || /\[|YOUR-/.test(String(v));

/** mailto for "Report an ad". Only what the player chooses to write is sent; nothing is attached. */
export function reportAdMailto(build = '') {
  const subject = encodeURIComponent('Nova\'s Café: report an ad');
  const body = encodeURIComponent(`Nova's Café ${build}\n\nWhat did the ad show, and why is it a problem? A screenshot helps.\n\n`);
  return `mailto:${APP_LINKS.contactEmail}?subject=${subject}&body=${body}`;
}

/** mailto for "Send feedback" (Settings > Extras). Only what the player chooses to write is sent. */
export function feedbackMailto(build = '') {
  const subject = encodeURIComponent('Nova\'s Café feedback');
  const body = encodeURIComponent(`Nova's Café ${build}

`);
  return `mailto:${APP_LINKS.contactEmail}?subject=${subject}&body=${body}`;
}

/** Opens an outside link. False when it is still a placeholder or the browser refused. */
export function openLink(url) {
  if (isPlaceholderLink(url)) return false;
  try {
    if (url.startsWith('mailto:')) { window.location.href = url; return true; }
    return !!window.open(url, '_blank', 'noopener');
  } catch (_) { return false; }
}
