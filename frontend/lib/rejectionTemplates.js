// lib/rejectionTemplates.js

export const REJECTION_REASONS = [
  { key: "not_accepted", label: "Not an accepted item" },
  { key: "too_large", label: "Too large" },
  { key: "poor_condition", label: "Poor condition" },
  { key: "overstocked", label: "Overstocked currently" },
];

export function buildRejectionEmail(reasonKey, donorFirstName = "there") {
  const name = donorFirstName || "there";

  switch (reasonKey) {
    case "not_accepted":
      return {
        subject: "Donation Item Not Accepted – Thank You for Thinking of The Bower",
        text: `Hi ${name},

Thank you so much for offering to donate to The Bower and support our mission to reduce waste and furnish homes.

Unfortunately, the item you submitted isn’t something we’re currently able to accept. We maintain a list of accepted items based on what we can safely collect, store, repair, or rehome — and this one falls outside of those categories.

If you’re ever unsure, you can always refer to our accepted items list when uploading donations. We really appreciate your efforts to reuse and reduce landfill, and hope you’ll consider donating other eligible items.

Warmly,
The Bower Collections Team
bower.org.au`,
        html: `<p>Hi ${name},</p>
<p>Thank you so much for offering to donate to The Bower and support our mission to reduce waste and furnish homes.</p>
<p>Unfortunately, the item you submitted isn’t something we’re currently able to accept. We maintain a list of accepted items based on what we can safely collect, store, repair, or rehome — and this one falls outside of those categories.</p>
<p>If you’re ever unsure, you can always refer to our accepted items list when uploading donations. We really appreciate your efforts to reuse and reduce landfill, and hope you’ll consider donating other eligible items.</p>
<p>Warmly,<br/>The Bower Collections Team<br/>bower.org.au</p>`,
      };

    case "too_large":
      return {
        subject: "Donation Too Large for Our Clients’ Needs",
        text: `Hi ${name},

Thanks for your recent donation offer to The Bower. We’re really grateful for your generosity and support.

While we appreciate the offer, the item you've submitted is unfortunately too large for our clients. Many of the people we support through the House to Home program live in smaller or shared accommodation, and as such we prioritise compact, space-saving furniture and furnishings that suit their homes.

If you have other items that are more modest in size — such as smaller tables, compact couches, or single beds — we’d love for you to upload them instead.

Thanks again for thinking of us and supporting reuse and repair.

All the best,
The Bower Collections Team
bower.org.au`,
        html: `<p>Hi ${name},</p>
<p>Thanks for your recent donation offer to The Bower. We’re really grateful for your generosity and support.</p>
<p>While we appreciate the offer, the item you've submitted is unfortunately too large for our clients. Many of the people we support through the House to Home program live in smaller or shared accommodation, and as such we prioritise compact, space-saving furniture and furnishings that suit their homes.</p>
<p>If you have other items that are more modest in size — such as smaller tables, compact couches, or single beds — we’d love for you to upload them instead.</p>
<p>Thanks again for thinking of us and supporting reuse and repair.</p>
<p>All the best,<br/>The Bower Collections Team<br/>bower.org.au</p>`,
      };

    case "poor_condition":
      return {
        subject: "Donation Unable to Be Accepted",
        text: `Hi ${name},

Thank you for offering to donate to The Bower. We really appreciate your desire to give items a second life.

Unfortunately, the item you submitted appears to be in poor condition and not suitable for reuse. We only accept items that are clean, complete, and in working condition — especially for the vulnerable households we support through House to Home.

If you have other items in better shape, we’d love to consider them. You’re also welcome to refer this item for manual review if you believe it may still be suitable.

Warm regards,
The Bower Collections Team
bower.org.au`,
        html: `<p>Hi ${name},</p>
<p>Thank you for offering to donate to The Bower. We really appreciate your desire to give items a second life.</p>
<p>Unfortunately, the item you submitted appears to be in poor condition and not suitable for reuse. We only accept items that are clean, complete, and in working condition — especially for the vulnerable households we support through House to Home.</p>
<p>If you have other items in better shape, we’d love to consider them. You’re also welcome to refer this item for manual review if you believe it may still be suitable.</p>
<p>Warm regards,<br/>The Bower Collections Team<br/>bower.org.au</p>`,
      };

    case "overstocked":
      return {
        subject: "Temporary Pause on Item Type",
        text: `Hi ${name},

Thanks so much for your recent donation offer. We love seeing the community’s generosity in action.

At the moment, we’re at full capacity for this type of item and don’t have the space or demand to accept more right now. We do our best to manage stock levels to avoid landfill — so we’re pausing collections for this category temporarily.

Please consider checking back in a few weeks or browsing our accepted items list for others we’re actively seeking.

Thanks again for your support of reuse and repair!

Warmly,
The Bower Collections Team
bower.org.au`,
        html: `<p>Hi ${name},</p>
<p>Thanks so much for your recent donation offer. We love seeing the community’s generosity in action.</p>
<p>At the moment, we’re at full capacity for this type of item and don’t have the space or demand to accept more right now. We do our best to manage stock levels to avoid landfill — so we’re pausing collections for this category temporarily.</p>
<p>Please consider checking back in a few weeks or browsing our accepted items list for others we’re actively seeking.</p>
<p>Thanks again for your support of reuse and repair!</p>
<p>Warmly,<br/>The Bower Collections Team<br/>bower.org.au</p>`,
      };

    default:
      return {
        subject: "Update on Your Donation",
        text: `Hi ${name},

Thanks for your donation submission to The Bower. This item won’t be proceeding at this time.

Warmly,
The Bower Collections Team
bower.org.au`,
        html: `<p>Hi ${name},</p>
<p>Thanks for your donation submission to The Bower. This item won’t be proceeding at this time.</p>
<p>Warmly,<br/>The Bower Collections Team<br/>bower.org.au</p>`,
      };
  }
}