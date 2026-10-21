// Preview-only transport: runs the same grounded assistant through the claude.ai
// artifact's built-in Claude access (the viewer's own account). Only bundled in
// `vite build --mode single`. Production uses the server in server/index.js.
import { parseDoc, buildIndex, selectContext, formatContext, systemInstructions } from '../../../shared/knowledge.js';
import { ChatError } from './transport.js';

const files = import.meta.glob('../../../knowledge/**/*.md', { query: '?raw', import: 'default', eager: true });
const INDEX = buildIndex(Object.entries(files).map(([p, raw]) => parseDoc(raw, p.split('/').pop().replace('.md', ''))));

let samplePromise;
const getSample = () => (samplePromise ??= window.claude?.use ? window.claude.use('sample') : Promise.resolve(null));

export async function streamViaArtifact(messages, { signal, onText }) {
  const sample = await getSample();
  if (!sample) throw new ChatError('unavailable', 'The live assistant runs when this preview is opened on claude.ai. On the real website it runs on your own server.');
  const ctx = selectContext(INDEX, messages);
  const rules = `${systemInstructions()}\n\n<knowledge mode="${ctx.mode}">\n${formatContext(ctx.chunks)}\n</knowledge>\n\nThe website visitor's conversation follows. Reply as Margam AI to their latest message.`;
  try {
    const { text, truncated } = await sample([{ role: 'user', content: rules }, ...messages], {
      signal, cache: false, modelTier: 'quick', onText: ({ text }) => onText(text),
    });
    return { text, truncated };
  } catch (e) {
    const map = {
      cancelled: '',
      not_granted: 'The assistant needs your permission to use Claude in this preview. Reload and choose Allow to try it.',
      rate_limited: 'Too many messages at once. Please wait a moment and try again.',
    };
    const err = new ChatError(e.code || 'upstream_error', map[e.code] ?? 'Something went wrong. Please try again.');
    err.partial = e.text || '';
    throw err;
  }
}
