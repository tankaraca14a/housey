import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readSocialUrls } from '../../app/components/SocialLinks.tsx';

const ORIG_IG = process.env.NEXT_PUBLIC_INSTAGRAM_URL;
const ORIG_FB = process.env.NEXT_PUBLIC_FACEBOOK_URL;

describe('readSocialUrls', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_INSTAGRAM_URL;
    delete process.env.NEXT_PUBLIC_FACEBOOK_URL;
  });
  afterEach(() => {
    if (ORIG_IG === undefined) delete process.env.NEXT_PUBLIC_INSTAGRAM_URL;
    else process.env.NEXT_PUBLIC_INSTAGRAM_URL = ORIG_IG;
    if (ORIG_FB === undefined) delete process.env.NEXT_PUBLIC_FACEBOOK_URL;
    else process.env.NEXT_PUBLIC_FACEBOOK_URL = ORIG_FB;
  });

  it('returns empty strings when neither env var is set', () => {
    expect(readSocialUrls()).toEqual({ instagramUrl: '', facebookUrl: '' });
  });

  it('reads only Instagram when only IG is set', () => {
    process.env.NEXT_PUBLIC_INSTAGRAM_URL = 'https://instagram.com/housey';
    expect(readSocialUrls()).toEqual({
      instagramUrl: 'https://instagram.com/housey',
      facebookUrl: '',
    });
  });

  it('reads only Facebook when only FB is set', () => {
    process.env.NEXT_PUBLIC_FACEBOOK_URL = 'https://facebook.com/housey';
    expect(readSocialUrls()).toEqual({
      instagramUrl: '',
      facebookUrl: 'https://facebook.com/housey',
    });
  });

  it('reads both when both are set', () => {
    process.env.NEXT_PUBLIC_INSTAGRAM_URL = 'https://instagram.com/housey';
    process.env.NEXT_PUBLIC_FACEBOOK_URL = 'https://facebook.com/housey';
    expect(readSocialUrls()).toEqual({
      instagramUrl: 'https://instagram.com/housey',
      facebookUrl: 'https://facebook.com/housey',
    });
  });

  it('trims whitespace from env var values', () => {
    process.env.NEXT_PUBLIC_INSTAGRAM_URL = '  https://instagram.com/housey  \n';
    expect(readSocialUrls().instagramUrl).toBe('https://instagram.com/housey');
  });

  it('treats empty string as unset', () => {
    process.env.NEXT_PUBLIC_INSTAGRAM_URL = '';
    process.env.NEXT_PUBLIC_FACEBOOK_URL = '';
    expect(readSocialUrls()).toEqual({ instagramUrl: '', facebookUrl: '' });
  });
});
