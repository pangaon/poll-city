export type ProductId =
  | "door-hanger"
  | "lawn-sign"
  | "flyer"
  | "palm-card"
  | "mailer-postcard"
  | "banner"
  | "button-pin"
  | "window-sign"
  | "bumper-sticker"
  | "t-shirt"
  | "hat"
  | "tote-bag"
  | "yard-stake"
  | "table-cover"
  | "lanyard";

export interface ProductSpec {
  id: ProductId;
  name: string;
  startingPrice: string;
  turnaround: string;
  summary: string;
  heroClass: string;
  icon: string; // lucide icon name
  sizes: string[];
  materials: string[];
  fileRequirements: string;
  pricing: Array<{ label: string; price: number }>;
}

export const PRINT_PRODUCTS: ProductSpec[] = [
  {
    id: "lawn-sign",
    name: "Lawn Signs",
    startingPrice: "$180",
    turnaround: "Standard 7 days",
    summary: "18x24 or 24x36, 4mm coroplast, UV weather resistant",
    heroClass: "from-emerald-500 via-lime-400 to-green-300",
    icon: "Flag",
    sizes: ["18x24 inches", "24x36 inches"],
    materials: ["4mm corrugated plastic", "H-stake included", "UV ink 2+ years outdoor"],
    fileRequirements: "PDF or AI, 300 DPI with bleed",
    pricing: [
      { label: "18x24 - 25", price: 180 },
      { label: "18x24 - 50", price: 280 },
      { label: "18x24 - 100", price: 420 },
      { label: "18x24 - 250", price: 750 },
      { label: "24x36 - 25", price: 240 },
      { label: "24x36 - 50", price: 380 },
      { label: "24x36 - 100", price: 580 },
      { label: "24x36 - 250", price: 1050 },
    ],
  },
  {
    id: "door-hanger",
    name: "Door Hangers",
    startingPrice: "$180",
    turnaround: "Rush 3 days",
    summary: "4.25x11 in, 14pt cardstock, UV gloss, full colour both sides",
    heroClass: "from-blue-500 via-cyan-400 to-sky-300",
    icon: "DoorOpen",
    sizes: ["4.25x11 inches"],
    materials: ["14pt cardstock", "UV gloss coating", "Full colour both sides"],
    fileRequirements: "PDF, CMYK, 300 DPI, flattened fonts embedded",
    pricing: [
      { label: "250", price: 180 },
      { label: "500", price: 280 },
      { label: "1000", price: 420 },
      { label: "2500", price: 750 },
      { label: "5000", price: 1200 },
    ],
  },
  {
    id: "flyer",
    name: "Flyers",
    startingPrice: "$55",
    turnaround: "Standard 7 days",
    summary: "5.5x8.5 or 8.5x11, 100lb gloss text, full colour both sides",
    heroClass: "from-amber-500 via-orange-400 to-yellow-300",
    icon: "FileText",
    sizes: ["8.5x11 inches", "5.5x8.5 inches"],
    materials: ["100lb gloss text paper", "Full colour both sides"],
    fileRequirements: "PDF, CMYK, 300 DPI",
    pricing: [
      { label: "8.5x11 - 100", price: 65 },
      { label: "8.5x11 - 250", price: 95 },
      { label: "8.5x11 - 500", price: 145 },
      { label: "8.5x11 - 1000", price: 210 },
      { label: "8.5x11 - 2500", price: 380 },
      { label: "8.5x11 - 5000", price: 580 },
      { label: "5.5x8.5 - 100", price: 55 },
      { label: "5.5x8.5 - 250", price: 80 },
      { label: "5.5x8.5 - 500", price: 120 },
      { label: "5.5x8.5 - 1000", price: 175 },
      { label: "5.5x8.5 - 2500", price: 310 },
      { label: "5.5x8.5 - 5000", price: 470 },
    ],
  },
  {
    id: "palm-card",
    name: "Palm Cards",
    startingPrice: "$120",
    turnaround: "Standard 7 days",
    summary: "4x9 in pocket card, 14pt cardstock, UV gloss",
    heroClass: "from-indigo-500 via-violet-400 to-fuchsia-300",
    icon: "CreditCard",
    sizes: ["4x9 inches"],
    materials: ["14pt cardstock", "Full colour both sides", "UV gloss coating"],
    fileRequirements: "PDF, CMYK, 300 DPI",
    pricing: [
      { label: "250", price: 120 },
      { label: "500", price: 180 },
      { label: "1000", price: 260 },
      { label: "2500", price: 450 },
      { label: "5000", price: 720 },
    ],
  },
  {
    id: "mailer-postcard",
    name: "Postcards",
    startingPrice: "$280",
    turnaround: "Standard 7 days",
    summary: "6x9 or 6x11, ORCA certified for Canada Post Neighbourhood Mail",
    heroClass: "from-rose-500 via-red-400 to-orange-300",
    icon: "Mail",
    sizes: ["6x9 inches", "6x11 inches"],
    materials: ["100lb gloss cover", "Address panel on reverse", "Postage not included"],
    fileRequirements: "PDF, CMYK, 300 DPI",
    pricing: [
      { label: "6x9 - 500", price: 280 },
      { label: "6x9 - 1000", price: 420 },
      { label: "6x9 - 2500", price: 750 },
      { label: "6x9 - 5000", price: 1200 },
    ],
  },
  {
    id: "bumper-sticker",
    name: "Bumper Stickers",
    startingPrice: "$95",
    turnaround: "Standard 7 days",
    summary: "3x10 in vinyl, weather-proof adhesive, UV laminated",
    heroClass: "from-purple-500 via-pink-400 to-rose-300",
    icon: "Sticker",
    sizes: ["3x10 inches", "4x8 inches"],
    materials: ["Vinyl with adhesive back", "UV laminated", "Weather-proof 3+ years"],
    fileRequirements: "PDF, CMYK, 300 DPI",
    pricing: [
      { label: "50", price: 95 },
      { label: "100", price: 145 },
      { label: "250", price: 250 },
      { label: "500", price: 380 },
      { label: "1000", price: 580 },
    ],
  },
  {
    id: "button-pin",
    name: "Buttons",
    startingPrice: "$35",
    turnaround: "Standard 7 days",
    summary: "1 in to 3.5 in digital print, mylar cover, steel back",
    heroClass: "from-pink-500 via-rose-400 to-red-300",
    icon: "Circle",
    sizes: ["1 inch", "1.5 inch", "2.25 inch", "3.5 inch"],
    materials: ["Full colour digital print", "Mylar cover", "Safety pin attachment"],
    fileRequirements: "PDF, CMYK, 300 DPI",
    pricing: [
      { label: "1 inch - 50", price: 35 },
      { label: "1 inch - 100", price: 55 },
      { label: "1 inch - 250", price: 95 },
      { label: "1 inch - 500", price: 155 },
      { label: "2.25 inch - 50", price: 55 },
      { label: "2.25 inch - 100", price: 85 },
      { label: "2.25 inch - 250", price: 145 },
      { label: "2.25 inch - 500", price: 240 },
    ],
  },
  {
    id: "t-shirt",
    name: "T-Shirts",
    startingPrice: "$14.99",
    turnaround: "7-10 days",
    summary: "Unisex crew neck, screen print or DTG, S-3XL",
    heroClass: "from-sky-500 via-blue-400 to-indigo-300",
    icon: "Shirt",
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    materials: ["100% ring-spun cotton", "Screen print (25+)", "DTG for small runs"],
    fileRequirements: "PNG or AI, 300 DPI, transparent background",
    pricing: [
      { label: "25", price: 375 },
      { label: "50", price: 625 },
      { label: "100", price: 1100 },
      { label: "250", price: 2375 },
    ],
  },
  {
    id: "hat",
    name: "Hats",
    startingPrice: "$18.99",
    turnaround: "7-10 days",
    summary: "Structured 5-panel cap, embroidered logo, adjustable snap",
    heroClass: "from-slate-600 via-gray-500 to-zinc-400",
    icon: "HardHat",
    sizes: ["One size adjustable"],
    materials: ["100% cotton twill", "3D puff embroidery", "Adjustable snapback"],
    fileRequirements: "AI or EPS vector, max 10,000 stitches",
    pricing: [
      { label: "25", price: 475 },
      { label: "50", price: 800 },
      { label: "100", price: 1400 },
      { label: "250", price: 3000 },
    ],
  },
  {
    id: "tote-bag",
    name: "Tote Bags",
    startingPrice: "$11.99",
    turnaround: "7-10 days",
    summary: "15x16 canvas tote, screen print, reinforced handles",
    heroClass: "from-lime-500 via-green-400 to-emerald-300",
    icon: "ShoppingBag",
    sizes: ["15x16 inches"],
    materials: ["12oz canvas", "Screen print one side", "Reinforced handles"],
    fileRequirements: "PNG or AI, 300 DPI",
    pricing: [
      { label: "25", price: 300 },
      { label: "50", price: 500 },
      { label: "100", price: 850 },
      { label: "250", price: 1800 },
    ],
  },
  {
    id: "banner",
    name: "Banners",
    startingPrice: "$45",
    turnaround: "Economy 14 days",
    summary: "13oz scrim vinyl, hemmed edges, brass grommets every 2 feet",
    heroClass: "from-slate-600 via-sky-500 to-cyan-300",
    icon: "Scroll",
    sizes: ["2x4", "2x6", "2x8", "3x6", "3x8 feet"],
    materials: ["13oz scrim vinyl", "UV print", "Indoor/outdoor rated"],
    fileRequirements: "PDF or AI, 150 DPI at full size",
    pricing: [
      { label: "2x4", price: 45 },
      { label: "2x6", price: 65 },
      { label: "2x8", price: 85 },
      { label: "3x6", price: 85 },
      { label: "3x8", price: 110 },
    ],
  },
  {
    id: "window-sign",
    name: "Window Clings",
    startingPrice: "$45",
    turnaround: "Standard 7 days",
    summary: "Static cling or adhesive vinyl in 8.5x11 or 11x17",
    heroClass: "from-teal-500 via-cyan-400 to-blue-300",
    icon: "Square",
    sizes: ["8.5x11 inches", "11x17 inches"],
    materials: ["Static cling (removable)", "Adhesive vinyl (permanent)", "Full colour"],
    fileRequirements: "PDF, CMYK, 300 DPI",
    pricing: [
      { label: "8.5x11 - 10", price: 45 },
      { label: "8.5x11 - 25", price: 85 },
      { label: "8.5x11 - 50", price: 145 },
      { label: "8.5x11 - 100", price: 240 },
      { label: "11x17 - 10", price: 65 },
      { label: "11x17 - 25", price: 120 },
      { label: "11x17 - 50", price: 210 },
      { label: "11x17 - 100", price: 350 },
    ],
  },
  {
    id: "yard-stake",
    name: "Yard Stakes",
    startingPrice: "$3.50",
    turnaround: "Standard 7 days",
    summary: "H-wire stakes for lawn signs, 10x30 galvanized steel",
    heroClass: "from-orange-500 via-amber-400 to-yellow-300",
    icon: "Anchor",
    sizes: ["10x30 inches (standard)", "15x30 inches (heavy duty)"],
    materials: ["9-gauge galvanized steel", "Rust-proof coating", "Easy push-in design"],
    fileRequirements: "No artwork needed",
    pricing: [
      { label: "25", price: 88 },
      { label: "50", price: 150 },
      { label: "100", price: 260 },
      { label: "250", price: 550 },
    ],
  },
  {
    id: "table-cover",
    name: "Table Covers",
    startingPrice: "$89",
    turnaround: "7-10 days",
    summary: "6ft or 8ft fitted table throw, full-colour dye sublimation",
    heroClass: "from-red-500 via-rose-400 to-pink-300",
    icon: "RectangleHorizontal",
    sizes: ["6ft fitted", "8ft fitted", "6ft draped", "8ft draped"],
    materials: ["Stretch polyester", "Full-colour dye sublimation", "Machine washable"],
    fileRequirements: "AI or PDF, CMYK, 150 DPI at full size",
    pricing: [
      { label: "6ft fitted - 1", price: 89 },
      { label: "6ft fitted - 3", price: 240 },
      { label: "8ft fitted - 1", price: 109 },
      { label: "8ft fitted - 3", price: 295 },
    ],
  },
  {
    id: "lanyard",
    name: "Lanyards",
    startingPrice: "$2.50",
    turnaround: "7-10 days",
    summary: "3/4 in polyester, dye sublimation, swivel hook, breakaway clip",
    heroClass: "from-violet-500 via-purple-400 to-fuchsia-300",
    icon: "Tag",
    sizes: ["3/4 inch width", "1 inch width"],
    materials: ["Polyester", "Dye sublimation print", "Swivel J-hook", "Breakaway safety clip"],
    fileRequirements: "AI or PDF, CMYK, 300 DPI",
    pricing: [
      { label: "50", price: 125 },
      { label: "100", price: 200 },
      { label: "250", price: 400 },
      { label: "500", price: 650 },
    ],
  },
];

export function getPrintProduct(id: string) {
  return PRINT_PRODUCTS.find((p) => p.id === id);
}

export function calculateUnitPrice(product: ProductSpec, quantity: number) {
  if (quantity <= 0) return 0;
  const first = product.pricing[0]?.price ?? 0;
  return Number((first / (Number(product.pricing[0]?.label.split(" - ").pop()) || 1)).toFixed(2));
}
