/**
 * Universal YouTube Input Parser
 * 
 * Supports:
 * - Standard Watch URLs: https://www.youtube.com/watch?v=VIDEO_ID
 * - Shortened URLs: https://youtu.be/VIDEO_ID
 * - Shorts URLs: https://www.youtube.com/shorts/VIDEO_ID
 * - Embed URLs: https://www.youtube.com/embed/VIDEO_ID
 * - Raw 11-char Video IDs: e.g. dQw4w9WgXcQ
 * - Handle URLs: https://www.youtube.com/@handle or raw @handle
 * - Channel ID URLs: https://www.youtube.com/channel/UC... or raw UC... ID (24 chars)
 * - Custom URLs: https://www.youtube.com/c/customName or /user/customName
 */

export type YouTubeParsedInput =
  | { type: 'video'; id: string }
  | { type: 'channel'; identifier: string; identifierType: 'handle' | 'id' | 'custom' }
  | { type: 'invalid'; reason?: string };

export function parseYouTubeInput(rawInput: string): YouTubeParsedInput {
  if (!rawInput || typeof rawInput !== 'string') {
    return { type: 'invalid', reason: 'Input is empty' };
  }

  const input = rawInput.trim();

  // 1. Raw Channel Handle (e.g. @MrBeast, @veritasium)
  if (input.startsWith('@') && /^@[a-zA-Z0-9_.-]{3,50}$/.test(input)) {
    return {
      type: 'channel',
      identifier: input.substring(1), // without '@'
      identifierType: 'handle',
    };
  }

  // 2. Raw Channel ID (Starts with UC and is exactly 24 characters)
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(input)) {
    return {
      type: 'channel',
      identifier: input,
      identifierType: 'id',
    };
  }

  // 3. Raw Video ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return {
      type: 'video',
      id: input,
    };
  }

  // 4. Channel URL with Handle (e.g. youtube.com/@MrBeast)
  const handleUrlMatch = input.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/@([a-zA-Z0-9_.-]{3,50})(?:\/.*)?$/i);
  if (handleUrlMatch && handleUrlMatch[1]) {
    return {
      type: 'channel',
      identifier: handleUrlMatch[1],
      identifierType: 'handle',
    };
  }

  // 5. Channel URL with Channel ID (e.g. youtube.com/channel/UC...)
  const channelUrlMatch = input.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})(?:\/.*)?$/i);
  if (channelUrlMatch && channelUrlMatch[1]) {
    return {
      type: 'channel',
      identifier: channelUrlMatch[1],
      identifierType: 'id',
    };
  }

  // 6. Custom Channel URL (e.g. youtube.com/c/creator or youtube.com/user/creator)
  const customUrlMatch = input.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:c|user)\/([a-zA-Z0-9_.-]{3,50})(?:\/.*)?$/i);
  if (customUrlMatch && customUrlMatch[1]) {
    return {
      type: 'channel',
      identifier: customUrlMatch[1],
      identifierType: 'custom',
    };
  }

  // 7. Video URL: youtube.com/watch?v=VIDEO_ID
  const watchUrlMatch = input.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:[^&]+&)*v=([a-zA-Z0-9_-]{11})/i);
  if (watchUrlMatch && watchUrlMatch[1]) {
    return {
      type: 'video',
      id: watchUrlMatch[1],
    };
  }

  // 8. Video URL: youtu.be/VIDEO_ID
  const youtuBeMatch = input.match(/(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (youtuBeMatch && youtuBeMatch[1]) {
    return {
      type: 'video',
      id: youtuBeMatch[1],
    };
  }

  // 9. Video URL: youtube.com/shorts/VIDEO_ID
  const shortsMatch = input.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) {
    return {
      type: 'video',
      id: shortsMatch[1],
    };
  }

  // 10. Video URL: youtube.com/embed/VIDEO_ID
  const embedMatch = input.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) {
    return {
      type: 'video',
      id: embedMatch[1],
    };
  }

  return {
    type: 'invalid',
    reason: 'Please enter a valid YouTube Video Link, Channel Link, @Handle, or 11-character Video ID.',
  };
}
