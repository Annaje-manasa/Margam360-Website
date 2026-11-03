// Server-side knowledge synthesis & contextual conversation engine.
// Grounded strictly in verified Margam360 published facts with multi-turn intent detection.
import { search, selectContext, systemInstructions, CONTACT_LINE } from '../shared/knowledge.js';

/**
 * Detect the intent of the message with conversation context.
 * @param {string} query Current user message
 * @param {{role: string, content: string}[]} history Previous conversation messages
 * @returns {string} Detected intent category
 */
export function detectIntent(query, history = []) {
  const q = query.toLowerCase().trim();
  const cleanQ = q.replace(/[^\w\s]/g, '').trim();

  // A. GREETINGS — Must be checked FIRST so greetings are NEVER misclassified as pricing or services
  if (
    /^(hi|hello|hey|heya|hola|namaste|greetings)(\s|$)/i.test(q) ||
    /^(good\s+(morning|afternoon|evening|day))(\s|$)/i.test(q) ||
    /^(how\s+are\s+you|how\s+are\s+you\s+doing|hows\s+it\s+going|how\s+do\s+you\s+do|whats\s+up|sup)(\s|$|\?)/i.test(cleanQ)
  ) {
    // Only if it doesn't contain a substantive question
    if (
      !/\b(cost|price|pricing|services?|seo|results?|case study|booking|book|charge|fees?|packages?)\b/i.test(q)
    ) {
      if (/good\s+morning/i.test(q)) return 'greeting_morning';
      if (/good\s+afternoon/i.test(q)) return 'greeting_afternoon';
      if (/good\s+evening/i.test(q)) return 'greeting_evening';
      if (/how\s+are\s+you/i.test(cleanQ)) return 'greeting_how_are_you';
      return 'greeting';
    }
  }

  // B. UNRELATED / SMALL TALK / JOKES / WEATHER / SPORTS
  if (
    /\b(joke|funny|laugh|humor|pun)\b/i.test(q) ||
    /\b(weather|forecast|temperature|rain|climate)\b/i.test(q) ||
    /\b(cricket|football|match|score|ipl|fifa|world cup|game)\b/i.test(q) ||
    /\b(recipe|cook|food|restaurant)\b/i.test(q) ||
    /\b(write (code|python|java|c\+\+|essay|poem)|solve)\b/i.test(q)
  ) {
    return 'unrelated';
  }

  // C. PRICING — Only when the user explicitly asks about pricing, costs, rates, packages
  if (
    /\b(how much|cost|costs|pricing|charges?|fees?|rates?|packages?|budget|quote)\b/i.test(q)
  ) {
    return 'pricing';
  }

  // D. STRATEGY CALL / CONSULTATION
  if (
    /\b(strategy call|growth call|free call|consultation|strategy session)\b/i.test(q) ||
    /is (the )?(consultation|call|session) free/i.test(q) ||
    /how does the (free )?strategy call work/i.test(q) ||
    /\b(bonuses|content calendar|brand audit|audit snapshot)\b/i.test(q)
  ) {
    return 'strategy_call';
  }

  // E. BOOKING ACTIONS (How can I book it? / Where to book?)
  if (
    /\b(how (can|do) i book|book it|how to book|where to book|schedule (a )?call)\b/i.test(q)
  ) {
    return 'booking_action';
  }

  // F. RESULTS / CASE STUDIES / TESTIMONIALS
  if (
    /\b(results|case stud(y|ies)|testimonials?|track record|roi|portfolio|past work|success rate)\b/i.test(q) ||
    /what results.*clients/i.test(q) ||
    /clients seen/i.test(q)
  ) {
    return 'results';
  }

  // G. CONTEXTUAL FOLLOW-UPS
  if (
    /\b(which (one|service) is best|best for (me|my business|a new business)|recommend(ed)? service)\b/i.test(q)
  ) {
    return 'followup_recommendation';
  }

  if (
    /\b(tell me more( about it)?|explain more|more details)\b/i.test(q)
  ) {
    return 'followup_tell_more';
  }

  if (
    /\b(improve (my )?(website )?traffic|increase traffic|get more traffic|more visitors)\b/i.test(q)
  ) {
    return 'traffic_improvement';
  }

  // H. SPECIFIC SERVICES
  if (/\b(seo|search engine|keywords?)\b/i.test(q)) return 'service_seo';
  if (/\b(performance (ads?|advertising)|google ads|meta ads|facebook ads|youtube ads|cpa|paid media)\b/i.test(q)) return 'service_ads';
  if (/\b(cro|conversion rate|landing pages?|checkout flows?|funnels?)\b/i.test(q)) return 'service_cro';
  if (/\b(whatsapp|whatsapp marketing)\b/i.test(q)) return 'service_whatsapp';
  if (/\b(email|email marketing|automations?|newsletters?|retention)\b/i.test(q)) return 'service_email';
  if (/\b(social media|instagram|facebook|linkedin)\b/i.test(q)) return 'service_social';

  // I. GENERAL SERVICES
  if (
    /\b(what services|services.*offer|what do you do|what.*you offer|capabilities|offerings|all services)\b/i.test(q)
  ) {
    return 'services_general';
  }

  // J. OFFICE LOCATION & CONTACT
  if (/\b(where is (your|the) office|location|address|located|hyderabad|working hours|hours|timings?)\b/i.test(q)) {
    return 'location';
  }
  if (/\b(us|united states|usa|america|outside india|international)\b/i.test(q)) {
    return 'us_clients';
  }
  if (/\b(contact|email|phone|reach you|call you)\b/i.test(q)) {
    return 'contact';
  }
  if (/\b(how do you use ai|margam ai|ai in marketing|machine learning|predictive|ai features?)\b/i.test(q)) {
    return 'ai_features';
  }
  if (/\b(process|how do you work|how we work|methodology|workflow|steps)\b/i.test(q)) {
    return 'process';
  }
  if (/\b(why margam360|why choose|why us|what makes you different)\b/i.test(q)) {
    return 'why_us';
  }

  return 'general_search';
}

/**
 * Generate a grounded conversational response from the indexed knowledge base.
 * @param {{role: string, content: string}[]} messages
 * @param {object} index - The BM25 index of knowledge chunks
 * @returns {string} The markdown-formatted response
 */
export function generateResponse(messages, index) {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content?.trim() || '';
  const priorMessages = messages.slice(0, -1);
  const lastAssistantMsg = [...priorMessages].reverse().find((m) => m.role === 'assistant')?.content || '';

  const intent = detectIntent(lastUserMsg, priorMessages);

  // 1. GREETINGS
  if (intent === 'greeting_morning') {
    return "Good morning! ☀️ Welcome to Margam360. I'm Margam AI. How can I help you today? Would you like to explore our services, understand our growth strategies, or learn more about our free 30-minute strategy call?";
  }
  if (intent === 'greeting_afternoon') {
    return "Good afternoon! 👋 Welcome to Margam360. I'm Margam AI. How can I help you today? Would you like to explore our services, understand our growth strategies, or learn more about our free 30-minute strategy call?";
  }
  if (intent === 'greeting_evening') {
    return "Good evening! 🌙 Welcome to Margam360. I'm Margam AI. How can I help you today? Would you like to explore our services, understand our growth strategies, or learn more about our free 30-minute strategy call?";
  }
  if (intent === 'greeting_how_are_you') {
    return "I'm doing great, thank you for asking! 😊 I'm Margam AI, your guide to Margam360. How can I help you today? We can explore our services, talk growth strategies, or schedule a free strategy session.";
  }
  if (intent === 'greeting') {
    return "Hi there! 👋 Welcome to Margam360. I'm Margam AI. How can I help you today? Would you like to explore our services, understand our growth strategies, or learn more about our free 30-minute strategy call?";
  }

  // 2. UNRELATED / OFF-TOPIC / JOKES / WEATHER
  if (intent === 'unrelated') {
    return (
      "I specialize in Margam360's performance marketing services, growth strategies, and client solutions! 😊\n\n" +
      "While I can't help with topics like jokes, weather, or sports, I'd be happy to answer any questions about growing your brand, our services, or our free 30-minute strategy call."
    );
  }

  // 3. PRICING
  if (intent === 'pricing') {
    return (
      "Pricing depends on your business goals, requirements and marketing budget. Our website does not publish fixed pricing. " +
      "You can book a free 30-minute growth call to discuss a suitable strategy."
    );
  }

  // 4. STRATEGY CALL / CONSULTATION
  if (intent === 'strategy_call') {
    return (
      "Yes, our **30-minute growth call** is completely free, with no pitch and no pressure, and you keep the plan either way:\n\n" +
      "- **Brand Audit Snapshot**: We review your current marketing before the call.\n" +
      "- **Custom Growth Roadmap**: A tailored 90-day plan aligned with your revenue targets.\n" +
      "- **Free Content Calendar**: Valued at ₹15,000, yours to keep after the session.\n\n" +
      "You can schedule your session directly via the **Book a call** button on the website, or message us on WhatsApp at +91 88855 54621."
    );
  }

  // 5. BOOKING ACTION (How can I book it?)
  if (intent === 'booking_action') {
    return (
      "You can easily book your **free 30-minute strategy call** directly on our website! " +
      "Simply click the **Book a call** button or navigate to our booking form below. " +
      "You can also message our team directly on WhatsApp at **+91 88855 54621** or email [hi@margam360.com](mailto:hi@margam360.com)."
    );
  }

  // 6. RESULTS
  if (intent === 'results') {
    return (
      "Our campaigns target measurable, compounding growth tied directly to revenue:\n\n" +
      "- **3X E-commerce ROI in 4 months** for a fashion & lifestyle brand in Hyderabad.\n" +
      "- **Page 3 to Position 1 on Google in <90 days** with 10X higher quality leads for a B2B SaaS startup in Telangana.\n" +
      "- **−40% Cost-Per-Acquisition (CPA)** across performance ad channels.\n" +
      "- **4.9 / 5 average rating** from client partnerships.\n\n" +
      "We follow a strict **Zero Junk Business** rule: we only take on clients we know we can genuinely help. Would you like to map out what we can achieve for your brand?"
    );
  }

  // 7. CONTEXTUAL FOLLOW-UPS
  if (intent === 'followup_recommendation') {
    return (
      "For a new or growing business, the ideal starting point depends on your goals, audience and budget. " +
      "We typically recommend starting with a **Growth Strategy** session to identify the right combination of services — such as SEO for long-term organic compounding paired with Performance Advertising for immediate qualified leads.\n\n" +
      "Could you share a bit about your business type (e.g., e-commerce, B2B, or local service) so I can guide you better?"
    );
  }

  if (intent === 'followup_tell_more') {
    const priorContext = (lastAssistantMsg + ' ' + priorMessages.map((m) => m.content).join(' ')).toLowerCase();
    if (priorContext.includes('seo')) {
      return (
        "Our **SEO & Content Marketing** service focuses on ranking in the **Top 3 for high-value commercial keywords**. " +
        "We optimize website architecture, fix technical crawl barriers, and publish intent-driven content that builds compounding domain authority. " +
        "Would you like to discuss an SEO audit for your site?"
      );
    }
    if (priorContext.includes('performance') || priorContext.includes('advertising') || priorContext.includes('ads')) {
      return (
        "Our **Performance Advertising** manages Meta, Google, and YouTube campaigns tuned weekly for profit, not just clicks. " +
        "We target **40% lower CPA** using predictive budgeting and continuous creative testing at scale."
      );
    }
    if (priorContext.includes('strategy call') || priorContext.includes('growth call')) {
      return (
        "During the **free 30-minute growth call**, our strategists analyze your current marketing, identify leakages, and build a custom 90-day growth roadmap. " +
        "Plus, you receive our **Brand Audit Snapshot** and a **₹15,000 Content Calendar** to keep."
      );
    }
    if (priorContext.includes('cro') || priorContext.includes('conversion')) {
      return (
        "Our **Conversion Rate Optimisation (CRO)** rebuilds landing pages, value propositions, and checkout flows based on user session data to double conversions from your existing traffic without needing extra ad spend."
      );
    }
    return (
      "I'd be glad to share more details! Are you interested in our specific marketing services, client case studies, or how our free 30-minute strategy call works?"
    );
  }

  if (intent === 'traffic_improvement') {
    return (
      "Yes, absolutely! We drive targeted, compounding website traffic through two primary engines:\n\n" +
      "1. **SEO & Content Marketing**: Reaching Top 3 rankings for high-intent search keywords.\n" +
      "2. **Social Media & Performance Ads**: Targeting 3X traffic from Instagram, Facebook, and LinkedIn, along with Google ad campaigns.\n\n" +
      "Most importantly, we pair traffic acquisition with **Conversion Rate Optimisation (CRO)** so that visitors actually convert into paying customers. Would you like to discuss your current traffic during a free growth call?"
    );
  }

  // 8. SERVICES (GENERAL & SPECIFIC)
  if (intent === 'service_seo') {
    return (
      "Yes! Our **SEO & Content Marketing** service targets **Top 3 rankings** for your highest-value search keywords.\n\n" +
      "We combine search-intent content with technical SEO so your organic pipeline compounds month over month. Would you like to discuss an SEO audit for your brand?"
    );
  }
  if (intent === 'service_ads') {
    return (
      "Our **Performance Advertising** manages Meta, Google, and YouTube campaigns tuned weekly for profit, not just clicks.\n\n" +
      "Our benchmark is targeting a **40% lower cost-per-acquisition (CPA)** through predictive budgeting and continuous creative testing. We can review your current ad accounts during our free strategy call."
    );
  }
  if (intent === 'service_cro') {
    return (
      "Our **Conversion Rate Optimisation (CRO)** service targets **+100% more sales** from your existing web traffic.\n\n" +
      "We rebuild landing pages, offer structures, and checkout flows based on real user session data to maximize revenue without requiring extra ad spend."
    );
  }
  if (intent === 'service_whatsapp') {
    return (
      "Yes! Our **WhatsApp Marketing** service delivers **+45% higher reply rates** through direct campaigns, verified catalogues, and automated conversational flows right where your customers already are."
    );
  }
  if (intent === 'service_email') {
    return (
      "Yes! Our **Email & Automation** service delivers a **58% lift in customer engagement** through automated lifecycle journeys that welcome, nurture, and win back customers on autopilot."
    );
  }
  if (intent === 'service_social') {
    return (
      "Yes! Our **Social Media Marketing** targets **3X traffic** from Instagram, Facebook, and LinkedIn with point-of-view content engineered to convert followers into active buyers."
    );
  }
  if (intent === 'services_general') {
    return (
      "Margam360 provides full-funnel, outcome-driven marketing services where every channel is tied to a measurable revenue target:\n\n" +
      "- **Growth Strategy**: Roadmap to 3X qualified leads in 3 months.\n" +
      "- **Performance Advertising**: −40% cost-per-acquisition across Meta, Google & YouTube.\n" +
      "- **SEO & Content Marketing**: Top 3 rankings for high-value search keywords.\n" +
      "- **Conversion Rate Optimisation (CRO)**: +100% sales from existing traffic.\n" +
      "- **Social Media Marketing**: 3X traffic from Instagram, Facebook & LinkedIn.\n" +
      "- **WhatsApp Marketing**: +45% higher reply rates with direct catalogues & broadcasts.\n" +
      "- **Email & Automation**: +58% customer engagement via automated lifecycle journeys.\n\n" +
      "Would you like to explore how any of these services fit into your current marketing stack?"
    );
  }

  // 9. LOCATION & OTHER DETAILS
  if (intent === 'location') {
    return (
      "Margam360 is located at:\n\n" +
      "**Madhusha Enclave, Beside NGRI Metro Station, Street No. 5, Hyderabad, Telangana, India.**\n\n" +
      "- **Working Hours**: Monday to Friday, 9 AM to 6 PM IST\n" +
      "- **Email**: [hi@margam360.com](mailto:hi@margam360.com)\n" +
      "- **Phone / WhatsApp**: +91 88855 54621\n\n" +
      "We partner with ambitious brands across India and the United States."
    );
  }
  if (intent === 'us_clients') {
    return (
      "Yes, Margam360 actively works with brands across **India and the United States**.\n\n" +
      "Our team manages global campaigns with multi-currency tracking, US timezone coordination, and full-funnel strategies tailored to your market."
    );
  }
  if (intent === 'contact') {
    return (
      "You can reach the Margam360 team directly via:\n\n" +
      "- **Email**: [hi@margam360.com](mailto:hi@margam360.com)\n" +
      "- **Phone / WhatsApp**: +91 88855 54621 (Mon–Fri, 9 AM–6 PM IST)\n" +
      "- **Strategy Call**: Book your free 30-minute growth session directly on the website."
    );
  }
  if (intent === 'ai_features') {
    return (
      "At Margam360, AI powers our growth engine across four key areas:\n\n" +
      "- **Predictive Budgeting**: Spend shifts dynamically toward ad sets most likely to convert next week, not just past winners.\n" +
      "- **Creative Testing at Scale**: Dozens of hook, headline, and visual variants are tested and pruned automatically.\n" +
      "- **Intent Signals**: Merges search, social, and on-site behaviour to identify active, in-market buyers.\n" +
      "- **Always-On Reporting**: Plain-English weekly performance summaries delivered to your inbox and WhatsApp."
    );
  }
  if (intent === 'process') {
    return (
      "We engineer compounding growth through a 4-step framework:\n\n" +
      "1. **Discover**: Deep-dive audit of your brand, competitors, and market opportunities to uncover high-impact gaps.\n" +
      "2. **Strategize**: A custom growth roadmap aligned with your revenue targets. Every rupee is accounted for before spending.\n" +
      "3. **Launch**: Multi-channel campaigns go live quickly with precision and creative quality.\n" +
      "4. **Scale**: Weekly data-driven optimization — winners get amplified, and underperforming assets get cut immediately."
    );
  }
  if (intent === 'why_us') {
    return (
      "Brands choose Margam360 because we act as a strategic growth partner, not an execution-only vendor:\n\n" +
      "- **Objectives First**: Clear, measurable KPIs defined before spending a single rupee.\n" +
      "- **Excellence Always**: Transparent reporting, ethical practices, and rated **4.9 / 5** by clients.\n" +
      "- **Highest Success Rate**: Campaigns that consistently outperform industry benchmarks by 2–3X.\n" +
      "- **Small Team, Big Results**: Dedicated growth teams with no junior account handoffs.\n" +
      "- **Zero Junk Business**: We only accept clients we are certain we can help scale."
    );
  }

  // 10. SEMANTIC SEARCH (ONLY for substantive, non-greeting queries)
  const hits = search(index, lastUserMsg, 3);
  if (hits.length > 0) {
    const primary = hits[0];
    const text = primary.text.trim();
    if (text.length > 60) {
      const cleanText = text
        .split('\n')
        .filter((l) => l.trim() && !l.startsWith('#'))
        .slice(0, 5)
        .join('\n');
      if (cleanText.length > 30) {
        return `${cleanText}\n\nFor more details or to discuss your specific requirements, feel free to book our **free 30-minute growth call** or contact us at [hi@margam360.com](mailto:hi@margam360.com).`;
      }
    }
  }

  // 11. UNANSWERABLE FALLBACK
  return (
    `I don't have information on that in our published details. As Margam AI, I can answer questions about Margam360's performance marketing services, results, process, and free strategy call.\n\n` +
    `For specific inquiries, please feel free to reach our team: ${CONTACT_LINE}`
  );
}

/**
 * Stream the response via Server-Sent Events (SSE).
 * Sends small chunks with realistic delay to provide smooth streaming.
 */
export async function streamResponse(text, send, signal) {
  const tokens = text.match(/\S+\s*/g) || [text];
  for (let i = 0; i < tokens.length; i++) {
    if (signal?.aborted) return;
    send('delta', { text: tokens[i] });
    await new Promise((resolve) => setTimeout(resolve, 15 + Math.random() * 15));
  }
}
