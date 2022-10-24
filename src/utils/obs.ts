function getCookie(cname: string): string {
  const cookiename = cname + '=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(cookiename) == 0) {
      return c.substring(cookiename.length, c.length);
    }
  }
  return '';
}

function debug(): boolean {
  return getCookie('obs') == 'true';
}

export function isOBS(): boolean {
  return !!window.obsstudio || debug();
}
