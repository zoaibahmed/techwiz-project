import {getCatalogueService} from '../workspace.service.js';
import {submitContactInquiryService} from '../inquiry.service.js';
import {sendContactFormEmail} from '../email.service.js';
import {env} from '../../config/env.js';


// Dictionary of produce synonyms and common misspellings (including phonetic/roman urdu)
const PRODUCE_SYNONYMS = {
  tomato: ['tomato', 'tomatoes', 'tommato', 'tommatos', 'tommatoo', 'tomatto', 'tomattos', 'tamatar', 'tomat'],
  potato: ['potato', 'potatoes', 'potatos', 'pottato', 'potatto', 'aloo', 'alu'],
  spinach: ['spinach', 'palak', 'saag', 'spinch'],
  cucumber: ['cucumber', 'cucumbers', 'kheera', 'khira', 'cucumbr'],
  strawberry: ['strawberry', 'strawberries', 'strawbery', 'straberry'],
  guava: ['guava', 'guavas', 'amrood'],
  onion: ['onion', 'onions', 'piyaz', 'pyaz'],
  chilli: ['chilli', 'chillies', 'chili', 'mirch', 'green chillies', 'green chilli'],
  gourd: ['gourd', 'lauki', 'kaddu', 'bottle gourd'],
  mint: ['mint', 'podina', 'pudina'],
  coriander: ['coriander', 'dhania', 'dhaniya'],
  honey: ['honey', 'shehad', 'shehed', 'wild honey'],
  apple: ['apple', 'apples', 'seb', 'aple'],
  egg: ['egg', 'eggs', 'anda', 'anday'],
  bread: ['bread', 'sourdough', 'loaf', 'roti'],
  carrot: ['carrot', 'carrots', 'gajar'],
};

// Real fallback images guaranteed to exist in Client/public/images/
function resolveProductImage(name = '', category = '', rawImage = '') {
  if (rawImage && (rawImage.startsWith('http') || rawImage.startsWith('data:'))) {
    return rawImage;
  }
  const n = (name || '').toLowerCase();
  if (/tomato/i.test(n)) return '/images/tomatoes.jpg';
  if (/apple/i.test(n)) return '/images/apples.jpg';
  if (/carrot/i.test(n)) return '/images/carrots.jpg';
  if (/honey/i.test(n)) return '/images/honey.jpg';
  if (/bread|sourdough/i.test(n)) return '/images/bread.jpg';
  if (/egg/i.test(n)) return '/images/eggs.jpg';

  const catMap = {
    'Fresh Vegetables': '/images/illustrations/vegetables.svg',
    'Orchard Fruits': '/images/illustrations/fruit.svg',
    'Fresh Herbs': '/images/illustrations/herbs.svg',
    'Dairy & Eggs': '/images/illustrations/dairy.svg',
    'Pantry & Honey': '/images/illustrations/pantry.svg',
    'Bakery': '/images/illustrations/bakery.svg',
  };
  return catMap[category] || '/images/harvest.jpg';
}

function detectTargetProduce(message, history = []) {
  const text = (message || '').toLowerCase();
  for (const [key, variants] of Object.entries(PRODUCE_SYNONYMS)) {
    for (const v of variants) {
      if (text.includes(v)) return key;
    }
  }

  // Check recent history if message is a follow-up ("near me", "where", "how much", etc.)
  if (/\b(near\s+me|where|which|market|how\s+much|cost|available)\b/i.test(text) && Array.isArray(history)) {
    for (let i = history.length - 1; i >= 0; i--) {
      const q = (history[i]?.question || '').toLowerCase();
      const r = (history[i]?.reply || '').toLowerCase();
      for (const [key, variants] of Object.entries(PRODUCE_SYNONYMS)) {
        for (const v of variants) {
          if (q.includes(v) || r.includes(v)) return key;
        }
      }
    }
  }
  return null;
}

// Keywords that mean the user is specifically asking for a product/produce list
const PRODUCT_ASK_PATTERNS = [
  /\b(show|find|search|look|looking|list|get|give|what|which|any|do you have|available|price|cost|cheap|cheapest|chapest|cheep|cheepest|affordable|best|buy|purchase)\b/i,
  /\b(produce|food|fresh|vegetable|vegetables|fruit|fruits)\b/i,
];

// Keywords for market/venue questions
const MARKET_ASK_PATTERNS = [/\b(markets?|venues?|where|location|address|open|opening|hours|day|days|visit|come|nearest|near me)\b/i];

// Keywords for farmer/grower questions
const FARMER_ASK_PATTERNS = [/\b(farmer|farmers|grower|growers|seller|sellers|stall|stalls|who|producer|producers)\b/i];

// Keywords that trigger sending message to admin or contact support
const INQUIRY_INTENT_PATTERNS = [
  /\b(send|sending|submit|submitting|leave|post|deliver)\s+(a\s+|an\s+)?(message|inquiry|query|note|email)\b/i,
  /\b(message|inquiry|query|note)\s+(to|for)\s+(the\s+)?(admin|administration|team|support)\b/i,
  /\b(contact|reach(\s+out\s+to)?|talk\s+to|write\s+to|email)\s+(the\s+)?(admin|administration|team|support)\b/i,
  /\b(can\s+you|cant\s+you|can't\s+you|can\s+i|could\s+you)\s+(send|message|contact|deliver|submit|notify)\b/i,
  /\b(i\s+want\s+to\s+(send|message|contact|write|reach|submit))\b/i,
  /\b(how\s+(can|do)\s+i\s+(send|message|contact|reach))\b/i,
  /\badmin\s+(message|inquiry|contact)\b/i,
];

function isExplicitInquiryFormat(text) {
  const hasName = /(?:name|my name is)\s*[:=-]/i.test(text);
  const hasEmail = /(?:email|e-mail)\s*[:=-]/i.test(text) || /[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/.test(text);
  const hasSubject = /(?:subject|topic|title)\s*[:=-]/i.test(text);
  const hasMessage = /(?:message|inquiry|query)\s*[:=-]/i.test(text);
  return (hasName && hasEmail) || (hasEmail && (hasSubject || hasMessage));
}

function wasLastMessageInquiryPrompt(history = []) {
  if (!history || history.length === 0) return false;
  const lastTurn = history[history.length - 1];
  if (!lastTurn || !lastTurn.reply) return false;
  if (/successfully sent to the admin team|Reference ID: #INQ/i.test(lastTurn.reply)) {
    return false;
  }
  return /To send your message directly to the Gather & Grow admin team|missing details|still need:|I have received:/i.test(lastTurn.reply);
}

function extractInquiryFields(text, history = []) {
  const inquiryUserTexts = [];
  if (Array.isArray(history)) {
    for (let i = history.length - 1; i >= 0; i--) {
      const turn = history[i];
      if (/successfully sent to the admin team|Reference ID: #INQ/i.test(turn.reply || '')) {
        break;
      }
      if (
        INQUIRY_INTENT_PATTERNS.some(p => p.test(turn.question || '')) ||
        isExplicitInquiryFormat(turn.question || '') ||
        /admin team|missing details|still need:|I have received:/i.test(turn.reply || '')
      ) {
        inquiryUserTexts.unshift(turn.question || '');
      } else {
        break;
      }
    }
  }
  inquiryUserTexts.push(text);
  const combined = inquiryUserTexts.join('\n');

  let name = '';
  let email = '';
  let phone = '';
  let subject = '';
  let message = '';

  // 1. Email
  const emailMatch = combined.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) email = emailMatch[1].trim();

  // 2. Phone
  const phoneMatch = combined.match(/(?:phone|tel|mobile|cell|contact\s*no|whatsapp)\s*(?:is|[:=-])?\s*(\+?\d[\d\s-]{7,}\d)/i);
  if (phoneMatch && phoneMatch[1]) phone = phoneMatch[1].replace(/\s+/g, ' ').trim();

  // 3. Name
  const nameMatch = combined.match(/(?:^|\n|,\s*|\.\s*)(?:my\s*name\s*is|full\s*name|name)\s*(?:is|[:=-])?\s*([^\n,.]+)/i);
  if (nameMatch) {
    name = nameMatch[1].split(/\s+(?:email|phone|subject|message)\s*[:=-]/i)[0].trim();
  }

  // 4. Subject
  const subjectMatch = combined.match(/(?:^|\n|,\s*|\.\s*)(?:subject|topic|title|regarding|about)\s*(?:is|[:=-])\s*([^\n,.]+)/i);
  if (subjectMatch) {
    subject = subjectMatch[1].split(/\s+(?:message|email|phone|name)\s*[:=-]/i)[0].trim();
  }

  // 5. Message
  const msgMatch = combined.match(/(?:^|\n|,\s*|\.\s*)(?:and\s+)?(?:message|body|inquiry|query|details?|content)\s*(?:is|[:=-])\s*([\s\S]+)/i);
  if (msgMatch) {
    let clean = msgMatch[1].trim();
    clean = clean.split(/\n(?=(?:name|email|phone|subject|topic)\s*[:=-])/i)[0].trim();
    if (clean) message = clean;
  }

  // Multi-line unlabeled fallback (if user provided lines without labels)
  if (!name || !email || !subject || !message) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 3 && !text.includes(':')) {
      for (const line of lines) {
        if (!email && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(line)) {
          email = line;
        } else if (!phone && /^(\+?\d[\d\s-]{7,}\d)$/.test(line)) {
          phone = line;
        } else if (!name && line.length < 40) {
          name = line;
        } else if (!subject && line.length < 70) {
          subject = line;
        } else if (!message) {
          message = line;
        }
      }
    }
  }

  // Fallback for message if other 3 exist
  if (!message && name && email && subject) {
    let leftover = text
      .replace(/send (?:a )?message(?: to admin)?/gi, '')
      .replace(/(?:^|\n|,\s*|\.\s*)(?:my\s*name\s*is|full\s*name|name)\s*(?:is|[:=-])?\s*[^\n,.]+/gi, '')
      .replace(/(?:^|\n|,\s*|\.\s*)(?:email|e-mail)\s*(?:is|[:=-])?\s*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
      .replace(/(?:^|\n|,\s*|\.\s*)(?:subject|topic|title|regarding|about)\s*(?:is|[:=-])\s*[^\n,.]+/gi, '')
      .replace(/(?:^|\n|,\s*|\.\s*)(?:phone|tel|mobile)\s*(?:is|[:=-])?\s*[^\n,.]+/gi, '')
      .trim();
    if (leftover.length > 3) {
      message = leftover;
    }
  }

  return { name, email, phone, subject, message };
}

export async function publicGuide(message, { country = '', city = '', history = [] } = {}) {
  // --- Check Contact Admin / Message Inquiry Intent First ---
  const isDirectInquiryAsk = INQUIRY_INTENT_PATTERNS.some(p => p.test(message));
  const hasInquiryFormat = isExplicitInquiryFormat(message);
  const isContinuingInquiry = wasLastMessageInquiryPrompt(history);

  if (isDirectInquiryAsk || hasInquiryFormat || isContinuingInquiry) {
    const fields = extractInquiryFields(message, history);

    const missing = [];
    if (!fields.name || fields.name.trim().length < 2) missing.push('Name');
    if (!fields.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) missing.push('Email');
    if (!fields.subject || fields.subject.trim().length < 2) missing.push('Subject');
    if (!fields.message || fields.message.trim().length < 3) missing.push('Message');

    if (missing.length > 0) {
      // If none of the required fields were provided yet
      if (missing.length === 4) {
        return {
          reply: `To send your message directly to the Gather & Grow admin team, please provide all of the following details:\n\n• **Name**: Your full name\n• **Email**: Your contact email address\n• **Subject**: What your message is regarding\n• **Message**: The details of your inquiry or message (and optional phone number)\n\nYou can reply in your next message like:\nName: [Your Name]\nEmail: [Your Email]\nSubject: [Your Subject]\nMessage: [Your Message]`,
          sources: [],
          products: [],
          engine: 'Contact Administrator',
          readOnly: true,
          needsInquiryFields: missing,
        };
      }

      // Partial fields provided: acknowledge what we have and ask for the rest
      const received = [];
      if (fields.name) received.push(`• **Name:** ${fields.name}`);
      if (fields.email) received.push(`• **Email:** ${fields.email}`);
      if (fields.phone) received.push(`• **Phone:** ${fields.phone}`);
      if (fields.subject) received.push(`• **Subject:** ${fields.subject}`);
      if (fields.message) received.push(`• **Message:** ${fields.message}`);

      return {
        reply: `I have received:\n${received.join('\n')}\n\nTo send your message to the admin team, I still need:\n${missing.map(m => `• **${m}**`).join('\n')}\n\nPlease reply with the missing details so I can submit your message.`,
        sources: [],
        products: [],
        engine: 'Contact Administrator',
        readOnly: true,
        needsInquiryFields: missing,
      };
    }

    // All required fields provided! Submit to admin inquiry database
    try {
      const inquiry = await submitContactInquiryService({
        name: fields.name,
        email: fields.email,
        phone: fields.phone || '',
        subject: fields.subject,
        message: fields.message,
      });

      let autoReplySent = false;
      try {
        const emailRes = await sendContactFormEmail({
          name: fields.name,
          email: fields.email,
          phone: fields.phone || '',
          subject: fields.subject,
          message: fields.message,
        });
        autoReplySent = emailRes?.autoReplySent ?? true;
      } catch (emailErr) {
        console.warn('[PublicGuide] Inquiry email dispatch note:', emailErr?.message);
      }

      return {
        reply: `✅ **Your message has been successfully sent to the admin team!**\n\n• **Reference ID:** #INQ-${inquiry.id.slice(-6).toUpperCase()}\n• **From:** ${inquiry.name} (${inquiry.email})\n• **Subject:** ${inquiry.subject}\n• **Message:** ${fields.message}\n${fields.phone ? `• **Phone:** ${fields.phone}\n` : ''}• **Status:** Received by Admin\n\nAn email notification has been dispatched to our administration inbox, and an automatic confirmation receipt has been sent to your email address (${inquiry.email}). Our team will review your inquiry and reply soon!`,
        sources: [],
        products: [],
        engine: 'Contact Administrator',
        readOnly: true,
        inquirySent: true,
        autoReplySent,
        inquiry: {
          id: inquiry.id,
          name: inquiry.name,
          email: inquiry.email,
          subject: inquiry.subject,
          createdAt: inquiry.createdAt,
        },
      };
    } catch {

      return {
        reply: "We encountered an issue submitting your message to the administration team. Please try submitting again or reach us via the Contact page.",
        sources: [],
        products: [],
        engine: 'Contact Administrator',
        readOnly: true,
      };
    }
  }

  const catalogue = await getCatalogueService();

  // Filter markets by location
  const markets = catalogue.markets.filter(
    m => m.active && (!country || m.countryCode === country) && (!city || m.city?.toLowerCase() === city.toLowerCase())
  );
  const ids = new Set(markets.map(m => m.id));

  // Farmers attending those markets
  const farmers = catalogue.farmers.filter(f => f.marketIds?.some(id => ids.has(id)));
  const farmerIds = new Set(farmers.map(f => f.id));
  const farmerMap = new Map(catalogue.farmers.map(f => [f.id, f]));

  // Products from those farmers
  const products = catalogue.products.filter(p => p.visible && farmerIds.has(p.farmerId));

  // --- Determine produce target & intent ---
  const restricted = /approve|suspend|delete|password|secret|database|admin dashboard|private|other.*orders/i.test(message);
  const targetProduce = detectTargetProduce(message, history);
  const wantsCheapest = /\b(cheap|cheapest|chapest|cheep|cheepest|affordable|lowest\s+price|best\s+price|budget)\b/i.test(message);

  const isNearMeFollowUp = /\b(near\s+me|where\s+(is|are|can)|which\s+market)\b/i.test(message);
  const wantsMarkets = isNearMeFollowUp || (MARKET_ASK_PATTERNS.some(p => p.test(message)) && !targetProduce);
  const wantsFarmers = FARMER_ASK_PATTERNS.some(p => p.test(message)) && !targetProduce;
  const wantsProducts = !!targetProduce || (!wantsMarkets && !wantsFarmers && PRODUCT_ASK_PATTERNS.some(p => p.test(message)));

  const guide = 'Browse Markets to choose a venue and day, Produce to find available food, and Our growers to meet the sellers. Add produce to your basket, choose a pickup window for each farmer and confirm your reservation. Pay in person at pickup. To send a message or inquiry to admin, provide your Name, Email, Subject, and Message directly in this chat.';

  // --- Location check for product queries ---
  if ((wantsProducts || isNearMeFollowUp) && !city && !country) {
    return {
      reply: "To show you local produce and nearby markets, I need to know your location first. Please set your location using the location button in the top navigation bar (the globe icon), then ask me again!",
      sources: [],
      products: [],
      engine: 'Location prompt',
      readOnly: true,
      needsLocation: true,
    };
  }

  if (restricted) {
    return {
      reply: "I'm Market Guide, your public market companion. I can explain shopping and show public markets, growers and produce. I cannot open private dashboards, read account records or change anything.",
      sources: [],
      products: [],
      engine: 'Public catalogue guide',
      readOnly: true,
    };
  }

  let reply = '';
  let sources = [];
  let productCards = [];
  let engine = 'Public catalogue guide';

  // --- 1. Product Queries with Exact & Typo-Tolerant Produce Matching ---
  if (wantsProducts && !isNearMeFollowUp) {
    let matchedProducts = [];

    if (targetProduce) {
      // Strictly match only the requested produce type
      const synonyms = PRODUCE_SYNONYMS[targetProduce] || [targetProduce];
      matchedProducts = products.filter(p => {
        const pName = (p.name || '').toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        return synonyms.some(syn => pName.includes(syn) || pCat.includes(syn));
      });
    } else {
      // General produce request (e.g. "show me fresh vegetables")
      matchedProducts = products.filter(p => p.available);
    }

    if (wantsCheapest) {
      // Sort strictly by price ascending
      matchedProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else {
      matchedProducts.sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0) || (a.price || 0) - (b.price || 0));
    }

    // If cheapest was requested or a singular item, show the top 1-2 cheapest; otherwise up to 4
    const shown = wantsCheapest ? matchedProducts.slice(0, 1) : matchedProducts.slice(0, 4);

    if (shown.length === 0) {
      const locationHint = city ? ` in ${city}` : country ? ` in your region` : '';
      const produceName = targetProduce ? `${targetProduce}s` : 'produce items';
      reply = `No ${produceName} are currently listed${locationHint}. Check back closer to market day or explore other local produce.`;
      productCards = [];
    } else {
      const locationHint = city ? ` in ${city}` : '';
      if (wantsCheapest && targetProduce) {
        const top = shown[0];
        const farmer = farmerMap.get(top.farmerId);
        const priceFmt = top.price ? (top.price / 100).toFixed(0) : '—';
        reply = `The cheapest ${targetProduce} available${locationHint} is ${top.name} from ${farmer?.name || 'local grower'} for ${top.currency || 'PKR'} ${priceFmt}/${top.unit || 'kg'}:`;
      } else {
        reply = `Here ${shown.length === 1 ? 'is' : 'are'} the available ${targetProduce || 'fresh produce'} listing${shown.length > 1 ? 's' : ''}${locationHint}:`;
      }

      productCards = shown.map(p => {
        const farmer = farmerMap.get(p.farmerId);
        return {
          id: p.id,
          name: p.name,
          category: p.category || '',
          image: resolveProductImage(p.name, p.category, p.image),
          price: p.price ? (p.price / 100).toFixed(0) : '—',
          currency: p.currency || 'PKR',
          unit: p.unit || 'kg',
          available: p.available,
          date: p.date || '',
          farmerName: farmer?.name || '',
          farmerId: p.farmerId,
          href: `/products/${p.id}`,
        };
      });
      sources = [];
    }
  } else if (isNearMeFollowUp || wantsMarkets) {
    // If user is following up ("but near me") and previously asked about produce
    if (targetProduce) {
      const synonyms = PRODUCE_SYNONYMS[targetProduce] || [targetProduce];
      const matchingFarmers = farmers.filter(f =>
        products.some(p => p.farmerId === f.id && synonyms.some(syn => (p.name || '').toLowerCase().includes(syn)))
      );
      const marketIdSet = new Set(matchingFarmers.flatMap(f => f.marketIds || []));
      const relevantMarkets = markets.filter(m => marketIdSet.has(m.id));
      const shownMarkets = relevantMarkets;

      if (shownMarkets.length === 0) {
        reply = `No markets near you${city ? ` in ${city}` : ''} currently feature ${targetProduce}. Try checking another city or market day.`;
      } else {
        const farmerNames = matchingFarmers.map(f => f.name).join(', ') || 'local growers';
        reply = `In ${city || 'your area'}, you can find fresh ${targetProduce} from ${farmerNames} at the following market${shownMarkets.length > 1 ? 's' : ''}:`;
        sources = shownMarkets.map(m => ({
          title: m.name,
          href: `/markets/${m.id}`,
          detail: `${m.city} · ${m.address} · ${m.hours}`,
        }));
      }
    } else {
      const shown = markets.slice(0, 4);
      if (shown.length === 0) {
        reply = `No active markets found${city ? ` in ${city}` : ''}. Try a different city or check back soon.`;
      } else {
        reply = `Here are active markets near you${city ? ` in ${city}` : ''}:`;
        sources = shown.map(m => ({
          title: m.name,
          href: `/markets/${m.id}`,
          detail: `${m.city} · ${m.address} · ${m.hours}`,
        }));
      }
    }
  } else if (wantsFarmers) {
    const shown = farmers.slice(0, 4);
    if (shown.length === 0) {
      reply = `No registered growers found${city ? ` in ${city}` : ''}. Farmers join by applying through the website.`;
    } else {
      reply = `Here are local growers${city ? ` in ${city}` : ''}:`;
      sources = shown.map(f => ({
        title: f.name,
        href: `/farmers/${f.id}`,
        detail: `${f.city || ''}${f.person ? ' · ' + f.person : ''}`,
      }));
    }
  } else {
    // General guidance
    reply = guide;
  }

  // --- Enhance with OpenAI if available and configured ---
  if (env.OPENAI_API_KEY && !restricted && (wantsProducts ? productCards.length > 0 : true)) {
    try {
      const contextData = wantsProducts
        ? productCards.map(p => `${p.name} — ${p.currency} ${p.price}/${p.unit} (${p.available ? 'available ' + p.date : 'not available'}) from ${p.farmerName}`).join(', ')
        : wantsMarkets || isNearMeFollowUp
          ? sources.map(s => `${s.title}: ${s.detail}`).join(', ')
          : wantsFarmers
            ? sources.map(s => `${s.title}: ${s.detail}`).join(', ')
            : '';

      const userLocation = city ? `${city}${country ? ', ' + country : ''}` : country || 'not set';

      // Build conversation context from recent history
      const conversationHistory = (history || []).slice(-4).flatMap(h => [
        { role: 'user', content: h.question },
        { role: 'assistant', content: h.reply }
      ]);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          model: env.OPENAI_MODEL || 'gpt-4o-mini',
          max_tokens: 250,
          messages: [
            {
              role: 'system',
              content: `You are Market Guide for Gather & Grow, a friendly public market assistant. User location: ${userLocation}.
Answer briefly and helpfully using ONLY the supplied catalogue data.
If the user asks for a message to admin or wants to contact admin, confirm that they can provide Name, Email, Subject, and Message right here in the chat and you will submit it directly to the admin team. NEVER say you cannot send messages.
If the user asks for a specific produce (like tomatoes), only mention that produce. If user asked for the cheapest, identify the lowest priced item clearly.
Keep response under 2-3 sentences.
Catalogue data: ${contextData || 'None listed currently'}.`,
            },
            ...conversationHistory,
            { role: 'user', content: message },
          ],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content;
        if (answer) {
          reply = answer;
          engine = 'Public catalogue AI';
        }
      }
    } catch {
      /* Keep the deterministic catalogue answer if AI fails */
    }
  }

  return {
    reply,
    sources: isNearMeFollowUp || wantsMarkets ? sources : wantsProducts ? [] : sources,
    products: productCards,
    engine,
    readOnly: true,
  };

}

