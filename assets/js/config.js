/* Just.us site settings.
   Safe to edit. The inbox for every form on the site is stored encoded below and is only
   assembled in the browser at the moment a form is sent, so it never appears in any page. */
window.JU_CONFIG = {
  site: "Just.us",
  // encoded inbox (do not edit by hand; regenerate with scripts/encode_inbox.py)
  _k: [202, 78, 119, 37, 66, 47, 211],
  _v: [66, 45, 70, 89, 34, 163, 178, 66, 37, 101, 70, 47, 185, 184, 93, 45, 82, 21, 43, 189],
  relay: "https://formsubmit.co/ajax/",

  // Optional payment links for the Support page. Leave empty to collect pledges by form
  // (you then reply with a payment link). Paste a full https:// URL to show a pay button.
  payments: {
    paypal: "",       // e.g. https://www.paypal.com/donate/?hosted_button_id=XXXX
    stripe: "",       // e.g. https://buy.stripe.com/XXXX
    kofi: "",         // e.g. https://ko-fi.com/yourname
    buymeacoffee: ""  // e.g. https://buymeacoffee.com/yourname
  }
};
