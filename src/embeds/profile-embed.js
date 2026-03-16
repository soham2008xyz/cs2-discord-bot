/**
 * profile-embed.js
 *
 * Converts a Leetify API profile response into a Discord embed message object.
 * Use the returned object directly with discord.js:
 *
 *   const { embeds } = buildProfileEmbed(data);
 *   await interaction.reply({ embeds });
 *
 * Or send it raw via the REST API:
 *   { embeds: [ buildProfileEmbed(data).embeds[0] ] }
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Round to `dec` decimal places and return as a plain number string. */
function fmt(n, dec = 1) {
  return parseFloat(n.toFixed(dec)).toString();
}

/** Return a sign-prefixed string, e.g. "+0.2" or "-0.1". */
function signed(n, dec = 1) {
  const v = parseFloat(n.toFixed(dec));
  return (v >= 0 ? '+' : '') + v;
}

/**
 * Discord embed colour (integer).
 * Leetify brand pink: #E91E63 = 15,278,691
 */
const EMBED_COLOR = 0xe91e63;

// ── Main builder ─────────────────────────────────────────────────────────────

/**
 * @param {object} data  - Raw Leetify API profile response
 * @param {object} [opts]
 * @param {string} [opts.clanTag]     - Optional clan tag to show next to the name
 * @param {string} [opts.peakRating]  - Optional peak Premier / Faceit rating string
 * @returns {{ embeds: object[] }}    - Discord message payload
 */
function buildProfileEmbed(data, opts = {}) {
  const { rating, stats, ranks } = data;
  const { clanTag = '', peakRating = null } = opts;

  // ── Computed values ───────────────────────────────────────────────────────

  // Overall leetify rating = average of CT & T sides
  const avgRating = (rating.ct_leetify + rating.t_leetify) / 2;

  // Winrate: CT side & T side opening-duel success
  const ctWin = Math.round(stats.ct_opening_duel_success_percentage);
  const tWin  = Math.round(stats.t_opening_duel_success_percentage);

  // Party score – flashbang enemies hit per throw (closest available proxy)
  const partyScore = fmt(stats.flashbang_hit_foe_per_flashbang, 2);

  // Avg HE damage: foe / friendly-fire
  const heDmg = `${fmt(stats.he_foes_damage_avg, 1)} / ${fmt(stats.he_friends_damage_avg, 1)}`;

  // Matches & ban percentage
  const banCount = Array.isArray(data.bans) ? data.bans.length : 0;
  const banPct   = data.total_matches > 0
    ? ((banCount / data.total_matches) * 100).toFixed(1)
    : '0.0';

  // KD proxy: trade_kills_success / traded_deaths_success
  const kdRatio = stats.traded_deaths_success_percentage > 0
    ? fmt(stats.trade_kills_success_percentage / stats.traded_deaths_success_percentage, 2)
    : 'N/A';

  // Banned mates %
  const bannedMatesPct = ((banCount / Math.max(data.total_matches, 1)) * 100).toFixed(2) + '%';

  // Peak rating label
  const peakLabel = peakRating
    ? `🔷 ${peakRating}`
    : ranks.premier
      ? `🔷 ${ranks.premier.toLocaleString()}`
      : ranks.faceit_elo
        ? `⚡ ${ranks.faceit_elo}`
        : `~${Math.abs(ranks.leetify).toFixed(2)} (Leetify)`;

  // ── Title ─────────────────────────────────────────────────────────────────
  //
  // Mirrors:  d4rkg0d | SCOPE.GG  [DMT]
  //
  const clanPart  = clanTag ? ` [${clanTag}]` : '';
  const titleText = `${data.name} | SCOPE.GG${clanPart}`;

  // ── Profile URL ───────────────────────────────────────────────────────────
  const leetifyUrl = `https://leetify.com/app/profile/${data.steam64_id}`;

  // ── Fields (inline, 3 per visual row in Discord) ─────────────────────────
  //
  // Discord renders inline fields in rows of up to 3.
  // We group our 15 stats into 5 rows × 3 columns, then add a blank spacer
  // after every third field to force a new visual row when needed.
  //
  // Row 1: AIM | CLUTCH | RATING | TIME TO DMG | WINRATE
  // Row 2: UTILITY | OPENING | PARTY | AVG HE DMG | MATCHES
  // Row 3: POSITION | KD | PREAIM | PEAK RATING | BANNED MATES
  //
  // Because Discord only supports 3 inline fields per row, we split each
  // visual 5-column row into two Discord rows separated by a blank spacer.

  /** Blank spacer field – forces the next field onto a new Discord row. */
  const SPACER = { name: '\u200B', value: '\u200B', inline: false };

  const fields = [
    // ── Row 1a (3) ──────────────────────────────────────────────────────
    {
      name: '🎯 AIM',
      value: fmt(rating.aim),
      inline: true,
    },
    {
      name: '🧊 CLUTCH',
      value: signed(rating.clutch),
      inline: true,
    },
    {
      name: '📈 RATING',
      value: signed(avgRating),
      inline: true,
    },
    // ── Row 1b (2 + pad) ────────────────────────────────────────────────
    {
      name: '⚡ TIME TO DMG',
      value: `${Math.round(stats.reaction_time_ms)}ms`,
      inline: true,
    },
    {
      name: '🏆 WINRATE',
      value: `${ctWin}% / ${tWin}%`,
      inline: true,
    },
    SPACER,

    // ── Row 2a (3) ──────────────────────────────────────────────────────
    {
      name: '💣 UTILITY',
      value: fmt(rating.utility),
      inline: true,
    },
    {
      name: '⚔️ OPENING',
      value: signed(rating.opening),
      inline: true,
    },
    {
      name: '🎉 PARTY',
      value: partyScore,
      inline: true,
    },
    // ── Row 2b (2 + pad) ─────────────────────────────────────────────────
    {
      name: '💥 AVG HE DMG',
      value: heDmg,
      inline: true,
    },
    {
      name: '🎮 MATCHES',
      value: `__${data.total_matches}__ / ${banPct}%`,
      inline: true,
    },
    SPACER,

    // ── Row 3a (3) ──────────────────────────────────────────────────────
    {
      name: '📍 POSITION',
      value: fmt(rating.positioning),
      inline: true,
    },
    {
      name: '💀 KD',
      value: kdRatio,
      inline: true,
    },
    {
      name: '📐 PREAIM',
      value: `${fmt(stats.preaim, 2)}°`,
      inline: true,
    },
    // ── Row 3b (2 + pad) ─────────────────────────────────────────────────
    {
      name: '🏔️ PEAK RATING',
      value: peakLabel,
      inline: true,
    },
    {
      name: '🚫 BANNED MATES',
      value: bannedMatesPct,
      inline: true,
    },
  ];

  // ── Assemble embed ────────────────────────────────────────────────────────
  const embed = {
    color: EMBED_COLOR,

    // "d4rkg0d | SCOPE.GG" clickable title → Leetify profile
    author: {
      name: titleText,
      url: leetifyUrl,
      icon_url: 'https://leetify.com/assets/images/meta/logo.png',
    },

    // Compact description showing the Leetify rating badge
    description: `📊 **Data provided by [Leetify](${leetifyUrl})**`,

    fields,

    footer: {
      text: 'View on Leetify',
      icon_url: 'https://leetify.com/assets/images/meta/logo.png',
    },

    url: leetifyUrl,

    timestamp: new Date().toISOString(),
  };

  return { embeds: [embed] };
}

// ── Export ────────────────────────────────────────────────────────────────────

module.exports = { buildProfileEmbed };
