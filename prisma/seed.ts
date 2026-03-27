import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

const img = (seed: string, w = 600, h = 600) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

function kebabCase(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80`;
const imageUrl = (ref: string) =>
  ref.startsWith("http://") ||
  ref.startsWith("https://") ||
  ref.startsWith("data:") ||
  ref.startsWith("/")
    ? ref
    : unsplash(ref);

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@nexora.com").toLowerCase();
  const adminPasswordPlain = process.env.ADMIN_PASSWORD || "admin123";
  await prisma.recommendationFeedback.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatConversation.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.browseEvent.deleteMany();
  await prisma.anonymousSession.deleteMany();
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.rewardRedemption.deleteMany();
  await prisma.rewardCatalog.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.loyaltyLedger.deleteMany();
  await prisma.newsletterSub.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.savedCard.deleteMany();
  await prisma.vendorBankAccount.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.sellerApplication.deleteMany();
  await prisma.sellerProfile.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  await prisma.faqItem.deleteMany();
  await prisma.faqCategory.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.carrier.deleteMany();
  await prisma.shippingZone.deleteMany();
  await prisma.homeSection.deleteMany();
  await prisma.platformSetting.deleteMany();

  const pass = (p: string) => bcrypt.hashSync(p, 10);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: pass(adminPasswordPlain),
      firstName: "Admin",
      lastName: "NEXORA",
      name: "Administrateur NEXORA",
      role: "ADMIN",
      emailVerified: true,
      loyaltyPoints: 0,
    },
  });

  const sellerUser = await prisma.user.create({
    data: {
      email: "vendeur@nexora.com",
      passwordHash: pass("vendeur123"),
      firstName: "Alex",
      lastName: "Marchand",
      name: "Alex Marchand",
      role: "SELLER",
      emailVerified: true,
      loyaltyPoints: 1200,
    },
  });

  await prisma.sellerProfile.create({
    data: {
      userId: sellerUser.id,
      shopName: "Tech & Style Nexus",
      description: "Vendeur démo NEXORA — électronique, mode et maison.",
      rating: 4.7,
      salesCount: 128,
      approved: true,
    },
  });

  const uMarie = await prisma.user.create({
    data: {
      email: "marie.dupont@nexora.com",
      passwordHash: pass("demo123"),
      firstName: "Marie",
      lastName: "Dupont",
      name: "Marie Dupont",
      role: "CLIENT",
      emailVerified: true,
      loyaltyPoints: 340,
    },
  });

  const uJean = await prisma.user.create({
    data: {
      email: "jean.martin@nexora.com",
      passwordHash: pass("demo123"),
      firstName: "Jean",
      lastName: "Martin",
      name: "Jean Martin",
      role: "CLIENT",
      emailVerified: true,
      loyaltyPoints: 890,
    },
  });

  const uSara = await prisma.user.create({
    data: {
      email: "sara.ben@nexora.com",
      passwordHash: pass("demo123"),
      firstName: "Sara",
      lastName: "Benali",
      name: "Sara Benali",
      role: "CLIENT",
      emailVerified: true,
      loyaltyPoints: 120,
    },
  });

  const uTom = await prisma.user.create({
    data: {
      email: "tom.levy@nexora.com",
      passwordHash: pass("demo123"),
      firstName: "Tom",
      lastName: "Levy",
      name: "Tom Levy",
      role: "CLIENT",
      emailVerified: true,
      loyaltyPoints: 2100,
    },
  });

  for (const u of [admin, sellerUser, uMarie, uJean, uSara, uTom]) {
    await prisma.address.create({
      data: {
        userId: u.id,
        label: "Principal",
        recipientName: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || "Destinataire démo",
        line1: "12 rue de la Paix",
        city: "Paris",
        postalCode: "75002",
        region: "Île-de-France",
        country: "France",
        isDefault: true,
      },
    });
  }

  await prisma.vendorBankAccount.create({
    data: {
      userId: sellerUser.id,
      iban: "FR7630001007941234567890185",
      bic: "BNPAFRPP",
      holderName: "Alex Marchand",
    },
  });

  await prisma.savedCard.create({
    data: {
      userId: uMarie.id,
      brand: "visa",
      last4: "4242",
      expMonth: 12,
      expYear: 2028,
      stripeMock: "pm_mock_marie",
    },
  });

  const carriers = await Promise.all([
    prisma.carrier.create({
      data: { name: "Siyan Trans Express", code: "SIYAN", active: true },
    }),
    prisma.carrier.create({
      data: { name: "VLAST PROM", code: "VLAST", active: true },
    }),
    prisma.carrier.create({
      data: { name: "KAVKAZ LOGISTIC", code: "KAVKAZ", active: true },
    }),
    prisma.carrier.create({
      data: { name: "Kikidrop", code: "KIKIDROP", active: true },
    }),
  ]);

  const zones = await Promise.all([
    prisma.shippingZone.create({
      data: { name: "Djibouti", code: "DJ", price: 3 },
    }),
    prisma.shippingZone.create({
      data: { name: "International", code: "INT", price: 20 },
    }),
  ]);

  const catData: { name: string; slug: string; children?: string[] }[] = [
    { name: "Vêtements", slug: "vetements", children: ["Homme", "Femme"] },
    { name: "Électronique", slug: "electronique", children: ["Audio", "Mobile"] },
    { name: "Maison", slug: "maison", children: ["Cuisine", "Décoration"] },
    { name: "Produit beauté", slug: "beaute", children: ["Soin", "Maquillage"] },
    { name: "Bijoux lunettes & montre", slug: "bijoux-lunettes-montre" },
    { name: "Chaussure", slug: "chaussure" },
    { name: "Sport et loisirs", slug: "sport-loisirs" },
    { name: "Parent & enfant jouet", slug: "parent-enfant-jouet" },
    { name: "Bagages sacs étuis", slug: "bagages" },
    { name: "Meubles", slug: "meubles" },
    { name: "Pièce détachées", slug: "pieces-detachees" },
    { name: "Tenue sport", slug: "tenue-sport" },
    { name: "Médical santé", slug: "medical-sante" },
    { name: "Hygiène perso", slug: "hygiene-perso" },
    { name: "Machine industrielle", slug: "machine-industrielle" },
    { name: "Véhicule et transport", slug: "vehicule-transport" },
    { name: "Agriculture aliment & boisson", slug: "agriculture-aliment" },
  ];

  const slug = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const categories: { id: string; slug: string }[] = [];
  for (const c of catData) {
    const parent = await prisma.category.create({
      data: { name: c.name, slug: c.slug },
    });
    categories.push({ id: parent.id, slug: parent.slug });
    for (const ch of c.children ?? []) {
      await prisma.category.create({
        data: {
          name: ch,
          slug: slug(`${c.slug}-${ch}`),
          parentId: parent.id,
        },
      });
    }
  }

  const getCat = (slug: string) => {
    const c = categories.find((x) => x.slug === slug);
    if (!c) throw new Error(`Catégorie manquante: ${slug}`);
    return c.id;
  };

  const brands = await Promise.all([
    prisma.brand.create({
      data: {
        name: "Nexora Labs",
        slug: "nexora-labs",
        logoUrl: img("brand-nexora", 200, 200),
      },
    }),
    prisma.brand.create({
      data: {
        name: "Pulse Audio",
        slug: "pulse-audio",
        logoUrl: img("pulse", 200, 200),
      },
    }),
    prisma.brand.create({
      data: {
        name: "Urban Fit",
        slug: "urban-fit",
        logoUrl: img("urbanfit", 200, 200),
      },
    }),
    prisma.brand.create({
      data: {
        name: "GreenHarvest",
        slug: "greenharvest",
        logoUrl: img("green", 200, 200),
      },
    }),
    prisma.brand.create({
      data: {
        name: "MediCare+",
        slug: "medicare-plus",
        logoUrl: img("medi", 200, 200),
      },
    }),
  ]);

  const b = (i: number) => brands[i % brands.length].id;

  type SeedProduct = {
    name: string;
    slug: string;
    catSlug: string;
    brandIdx: number;
    description: string;
    price: number;
    comparePrice: number;
    stock: number;
    imageUrl: string;
  };

  const mk = (
    catSlug: string,
    brandIdx: number,
    name: string,
    description: string,
    price: number,
    stock: number,
    imageRef: string
  ) => {
    const s = kebabCase(name);
    const comparePrice = Math.round(price * 100 * (1.1 + (s.length % 20) / 100)) / 100; // ~10% à ~30% au dessus
    return {
      name,
      slug: s,
      catSlug,
      brandIdx,
      description,
      price,
      comparePrice,
      stock,
      imageUrl: imageUrl(imageRef),
    } satisfies SeedProduct;
  };

  const productDefs: SeedProduct[] = [
    // AGRICULTURE, ALIMENT & BOISSON
    mk(
      "agriculture-aliment",
      3,
      "Engrais NPK 20kg",
      "Engrais complet NPK adapté au potager et aux cultures en pleine terre. Granulés faciles à épandre, pour une nutrition régulière et homogène. Idéal en préparation de sol ou en entretien.",
      39.9,
      120,
      "1416879595882-3373a0480b5b"
    ),
    mk(
      "agriculture-aliment",
      3,
      "Semences de tomates",
      "Graines sélectionnées pour une germination fiable et une bonne vigueur des plants. Convient à la culture en intérieur ou en serre, puis repiquage au jardin. Récolte abondante en saison.",
      4.9,
      180,
      "1592997571659-0b21ff64313b"
    ),
    mk(
      "agriculture-aliment",
      3,
      "Arrosoir 10L",
      "Arrosoir robuste avec poignée ergonomique pour un arrosage confortable. Pomme amovible pour un jet doux ou plus direct selon les besoins. Parfait pour balcon, serre ou jardin.",
      14.9,
      140,
      "1416879595882-3373a0480b5b"
    ),
    mk(
      "agriculture-aliment",
      3,
      "Houe agricole",
      "Houe solide pour désherber, aérer la terre et former des sillons. Lame résistante et prise en main stable pour les travaux réguliers. Indispensable au potager.",
      24.9,
      90,
      "1500651230702-0e2d8a49d4ad"
    ),
    mk(
      "agriculture-aliment",
      3,
      "Sac de riz Basmati 5kg",
      "Riz basmati long grain, parfumé et non collant après cuisson. Idéal pour plats du quotidien, currys et recettes orientales. Conditionnement pratique pour la famille.",
      16.9,
      160,
      "1586201375761-83865001e31c"
    ),
    mk(
      "agriculture-aliment",
      3,
      "Huile d'olive extra vierge 1L",
      "Huile d'olive extra vierge pressée à froid, goût fruité et équilibré. Parfaite pour assaisonnement, marinades et cuisson douce. Bouteille 1L pour un usage régulier.",
      11.9,
      150,
      "1474979266404-7eaacbcd87c5"
    ),
    mk(
      "agriculture-aliment",
      3,
      "Thé vert bio 100g",
      "Thé vert issu de l'agriculture biologique, notes végétales et fraîches. Infusion légère pour le matin ou l'après-midi. Sachet refermable pour conserver les arômes.",
      7.9,
      130,
      "1556742049-0cfed4f6a45d"
    ),
    mk(
      "agriculture-aliment",
      3,
      "Café moulu Arabica 250g",
      "Café 100% Arabica, torréfaction équilibrée pour une tasse aromatique. Mouture adaptée aux cafetières filtre et méthodes douces. Paquet 250g fraîcheur.",
      6.9,
      170,
      "1447933601403-0c6688de566e"
    ),
    mk(
      "agriculture-aliment",
      3,
      "Jus de mangue naturel 1L",
      "Jus de mangue riche et onctueux, sans goût artificiel dominant. À servir frais au petit-déjeuner ou en smoothie. Bouteille 1L pratique pour la maison.",
      4.5,
      200,
      "1546173159-315724a31696"
    ),
    mk(
      "agriculture-aliment",
      3,
      "Miel pur artisanal 500g",
      "Miel artisanal au goût floral, texture douce et parfum naturel. Idéal en cuisine, boisson chaude ou tartines. Pot 500g pour une utilisation quotidienne.",
      9.9,
      110,
      "1587049352846-4a222e784d38"
    ),

    // BAGAGE, SACS & ÉTUIS
    mk(
      "bagages",
      2,
      "Valise cabine 55cm",
      "Valise cabine au format compatible avec la plupart des compagnies. Coque résistante et intérieur compartimenté pour optimiser le rangement. Poignée télescopique fluide.",
      79.9,
      80,
      "1553062407-98eeb64c6a62"
    ),
    mk(
      "bagages",
      2,
      "Sac à dos 30L",
      "Sac à dos polyvalent 30L avec poches organisées pour le quotidien ou la randonnée légère. Dos rembourré et bretelles confort. Compartiment ordinateur selon usage.",
      39.9,
      140,
      "1553062407-98eeb64c6a62"
    ),
    mk(
      "bagages",
      2,
      "Sac de voyage 70L",
      "Grand sac de voyage 70L conçu pour les longs séjours. Ouverture large, tissus solides et sangles de portage pratiques. Idéal sport, week-end ou déplacement.",
      54.9,
      70,
      "1548036328-c9fa89d128fa"
    ),
    mk(
      "bagages",
      2,
      "Porte-monnaie cuir",
      "Porte-monnaie en cuir avec compartiments cartes et monnaie. Format compact et fermeture sécurisée. Finition sobre pour un usage durable.",
      24.9,
      160,
      "1627123424574-724758594785"
    ),
    mk(
      "bagages",
      2,
      "Étui laptop 15\"",
      "Housse de protection pour ordinateur 15 pouces, doublure douce anti-rayures. Fermeture zippée et profil fin pour glisser dans un sac. Parfaite pour le transport quotidien.",
      19.9,
      150,
      "1611532736597-de2d4265fba3"
    ),
    mk(
      "bagages",
      2,
      "Sac bandoulière",
      "Sac bandoulière pratique pour garder l'essentiel à portée de main. Poches zippées et sangle réglable pour un port confortable. Style urbain et compact.",
      29.9,
      120,
      "1590874103328-eac38a683ce7"
    ),
    mk(
      "bagages",
      2,
      "Trousse de toilette",
      "Trousse de toilette avec compartiments pour organiser gels, brosse et accessoires. Matière facile à nettoyer et fermeture robuste. Indispensable en voyage.",
      14.9,
      190,
      "1564858664925-c08e5b8b1cce"
    ),
    mk(
      "bagages",
      2,
      "Pochette rangement",
      "Pochette de rangement pour câbles, chargeurs et petits accessoires. Élastiques intérieurs et poches zippées pour éviter le désordre. Format compact.",
      12.9,
      200,
      "1601924994987-69e26d50dc26"
    ),
    mk(
      "bagages",
      2,
      "Sac de sport 40L",
      "Sac de sport 40L avec poche chaussures et compartiment principal spacieux. Poignées solides et bandoulière rembourrée. Adapté salle, week-end et entraînements.",
      34.9,
      110,
      "1553062407-98eeb64c6a62"
    ),
    mk(
      "bagages",
      2,
      "Valise rigide 4 roues",
      "Valise rigide avec 4 roues pivotantes pour un roulage stable. Coque résistante aux chocs et intérieur sanglé. Idéale pour voyager sereinement.",
      99.9,
      60,
      "1565026057447-bc90a3dceb87"
    ),

    // BIJOUX, LUNETTES & MONTRES
    mk(
      "bijoux-lunettes-montre",
      0,
      "Montre connectée Samsung",
      "Montre connectée pour le suivi d'activité, notifications et santé au quotidien. Écran lisible et bracelets interchangeables selon le style. Autonomie pensée pour la journée.",
      229,
      60,
      "1523275335684-37898b6baf30"
    ),
    mk(
      "bijoux-lunettes-montre",
      2,
      "Lunettes de soleil Ray-Ban",
      "Lunettes de soleil au design iconique avec protection UV adaptée. Monture confortable pour un port prolongé. Verres teintés pour réduire l'éblouissement.",
      129,
      90,
      "1511499767150-a48a237f0083"
    ),
    mk(
      "bijoux-lunettes-montre",
      2,
      "Bracelet argent 925",
      "Bracelet en argent 925 au fini brillant, facile à assortir. Fermoir sécurisé et taille confortable. Idéal en cadeau ou pour compléter une tenue.",
      39.9,
      130,
      "1573408301185-9519f94f1688"
    ),
    mk(
      "bijoux-lunettes-montre",
      2,
      "Collier or 18 carats",
      "Collier en or 18 carats au style minimaliste. Chaîne fine, élégante et résistante pour un usage régulier. Livré dans un écrin.",
      349,
      30,
      "1515562141207-7a88fb7ce338"
    ),
    mk(
      "bijoux-lunettes-montre",
      2,
      "Bague diamant simulé",
      "Bague élégante avec pierre simulée au rendu lumineux. Conçue pour une tenue confortable et un style habillé. Parfaite pour un look chic au quotidien.",
      49.9,
      100,
      "1605100804763-247f67b3557e"
    ),
    mk(
      "bijoux-lunettes-montre",
      2,
      "Montre analogique Casio",
      "Montre analogique fiable et légère, idéale pour tous les jours. Lecture claire, boîtier robuste et bracelet confortable. Un classique intemporel.",
      34.9,
      150,
      "1434493789847-2f02dc6ca35d"
    ),
    mk(
      "bijoux-lunettes-montre",
      2,
      "Lunettes anti-lumière bleue",
      "Lunettes filtrantes pour réduire l'inconfort visuel devant écrans. Monture légère et adaptée au bureau. Conçues pour un port prolongé.",
      24.9,
      170,
      "1574258495973-f010dfbb5371"
    ),
    mk(
      "bijoux-lunettes-montre",
      2,
      "Boucles d'oreilles perles",
      "Boucles d'oreilles avec perles au style sobre et élégant. Parfaites pour occasions ou tenue de tous les jours. Fermoir confortable et discret.",
      29.9,
      120,
      "1535632066927-ab7c9ab60908"
    ),
    mk(
      "bijoux-lunettes-montre",
      2,
      "Pendentif en or",
      "Pendentif en or au design simple, facile à porter au quotidien. Finition soignée et rendu lumineux. Idéal pour personnaliser un collier.",
      199,
      40,
      "1599643478518-a784e5dc4c8f"
    ),
    mk(
      "bijoux-lunettes-montre",
      2,
      "Montre sport étanche",
      "Montre sport résistante à l'eau pour entraînements et activités extérieures. Bracelet robuste et affichage lisible. Conçue pour le rythme du quotidien.",
      59.9,
      110,
      "1508685096489-7aacd43bd3b1"
    ),

    // CHAUSSURES
    mk(
      "chaussure",
      2,
      "Baskets Nike Air Max",
      "Baskets au confort amorti et au look urbain. Semelle stable pour marche et usage quotidien. Style polyvalent facile à assortir.",
      129,
      80,
      "1542291026-7eec264c27ff"
    ),
    mk(
      "chaussure",
      2,
      "Chaussures de randonnée",
      "Chaussures de randonnée avec maintien de cheville et semelle adhérente. Conçues pour sentiers et sorties nature. Matières résistantes et respirantes.",
      99.9,
      70,
      "1539185441755-9523a8bce36c"
    ),
    mk(
      "chaussure",
      2,
      "Escarpins talon 8cm",
      "Escarpins élégants avec talon 8 cm pour une silhouette élancée. Semelle stable et intérieur confortable. Idéals pour événements et bureau.",
      49.9,
      90,
      "1543163521-1bf539c55dd2"
    ),
    mk(
      "chaussure",
      2,
      "Sandales cuir homme",
      "Sandales en cuir pour l'été, semelle confortable et lanières ajustées. Bonne tenue du pied pour la marche. Style sobre et durable.",
      39.9,
      110,
      "1603487742131-4160ec999306"
    ),
    mk(
      "chaussure",
      2,
      "Bottes d'hiver",
      "Bottes d'hiver conçues pour le froid, doublure chaude et semelle antidérapante. Protection contre l'humidité et confort de marche. Idéales en ville.",
      79.9,
      60,
      "1520639888713-7851133b1ed0"
    ),
    mk(
      "chaussure",
      2,
      "Mocassins cuir marron",
      "Mocassins en cuir marron au style classique. Confortables pour une journée complète, faciles à enfiler. Parfaits avec tenue casual ou habillée.",
      69.9,
      75,
      "1614253429340-98120bd6d753"
    ),
    mk(
      "chaussure",
      2,
      "Chaussures de foot Adidas",
      "Chaussures de football pour terrain synthétique ou pelouse selon modèle. Bon maintien et accroche pour les appuis rapides. Conçues pour l'entraînement et les matchs.",
      89.9,
      85,
      "1511886929837-354d827aae26"
    ),
    mk(
      "chaussure",
      2,
      "Ballerines femme",
      "Ballerines légères et confortables pour le quotidien. Semelle souple et design minimaliste. Faciles à porter au bureau ou en sortie.",
      29.9,
      120,
      "1518049362265-d5b2a6467637"
    ),
    mk(
      "chaussure",
      2,
      "Tongs de plage",
      "Tongs simples et résistantes pour la plage et la piscine. Semelle confortable et séchage rapide. Idéales en vacances.",
      9.9,
      200,
      "1563861826100-9cb868fdbe1c"
    ),
    mk(
      "chaussure",
      2,
      "Chaussures de sécurité",
      "Chaussures de sécurité avec embout renforcé pour protéger le pied. Semelle antidérapante et confort pour longues journées. Adaptées chantier et atelier.",
      59.9,
      100,
      "1605733160314-4fc7dac4bb16"
    ),

    // ÉLECTRONIQUE
    mk(
      "electronique",
      0,
      "iPhone 15 Pro",
      "Smartphone haut de gamme avec écran OLED fluide et appareil photo performant. Idéal pour photo/vidéo, productivité et usages quotidiens. Finition premium et recharge rapide.",
      1199,
      25,
      "1592750475338-74b7b21085ab"
    ),
    mk(
      "electronique",
      0,
      "Samsung Galaxy S24",
      "Smartphone puissant avec bel écran et excellente autonomie. Photos détaillées et usage fluide au quotidien. Compatible 5G et charge rapide.",
      999,
      30,
      "1610945265064-0e34e5519bbf"
    ),
    mk(
      "electronique",
      1,
      "Écouteurs Bluetooth AirPods",
      "Écouteurs sans fil compacts avec son clair et appairage rapide. Parfaits pour appels et musique au quotidien. Boîtier de charge pratique en poche.",
      179,
      90,
      "1505740420928-5e560c06d30e"
    ),
    mk(
      "electronique",
      0,
      "Tablette iPad 10\"",
      "Tablette polyvalente pour navigation, vidéo et prise de notes. Écran confortable 10 pouces et bonne autonomie. Compatible accessoires pour productivité.",
      449,
      55,
      "1544244015-0df4b3ffc6b0"
    ),
    mk(
      "electronique",
      0,
      "Disque SSD externe 1To",
      "SSD externe 1To pour sauvegarde rapide et transport de fichiers. Vitesses élevées pour photo/vidéo et projets lourds. Boîtier compact et solide.",
      99.9,
      120,
      "1601737487795-dab272f52420"
    ),
    mk(
      "electronique",
      0,
      "Clé USB 128Go",
      "Clé USB 128Go pour documents, photos et transferts rapides. Format compact et connectique pratique selon modèle. Idéale pour école et travail.",
      14.9,
      200,
      "1618354691373-d851c5c3a990"
    ),
    mk(
      "electronique",
      0,
      "Chargeur rapide 65W",
      "Chargeur rapide 65W compatible smartphones, tablettes et certains laptops. Protection contre surchauffe et surtension. Parfait pour voyager léger.",
      29.9,
      160,
      "1591154669695-5f2a8d20c089"
    ),
    mk(
      "electronique",
      0,
      "Souris sans fil Logitech",
      "Souris sans fil précise et confortable pour bureau ou télétravail. Connexion stable et autonomie longue. Format ergonomique pour un usage prolongé.",
      24.9,
      150,
      "1527814050087-3793815479db"
    ),
    mk(
      "electronique",
      0,
      "Clavier mécanique RGB",
      "Clavier mécanique avec touches réactives et rétroéclairage RGB. Conçu pour jeu et frappe intensive. Construction solide et sensations nettes.",
      69.9,
      90,
      "1587829741301-dc798b83add3"
    ),
    mk(
      "electronique",
      0,
      "Batterie externe 20000mAh",
      "Powerbank 20000mAh pour recharger plusieurs appareils en déplacement. Indicateur de charge et sorties multiples selon modèle. Indispensable en voyage.",
      34.9,
      140,
      "1609091839311-d5365f9ff1c5"
    ),

    // HYGIÈNE PERSONNELLE
    mk(
      "hygiene-perso",
      0,
      "Brosse à dents électrique",
      "Brosse à dents électrique pour un brossage plus efficace qu'une manuelle. Modes adaptés et minuteur intégré selon modèle. Recharge simple et pratique.",
      39.9,
      120,
      "1559591935-b558bdb5e0e3"
    ),
    mk(
      "hygiene-perso",
      0,
      "Rasoir Gillette Fusion",
      "Rasoir multi-lames pour un rasage précis et confortable. Bonne glisse et poignée antidérapante. Compatible avec recharges du même système.",
      12.9,
      180,
      "1621607505828-c5ce83e8c2b6"
    ),
    mk(
      "hygiene-perso",
      0,
      "Gel douche 500ml",
      "Gel douche 500ml au parfum frais, mousse agréable. Nettoie sans agresser, adapté à un usage quotidien. Flacon pratique sous la douche.",
      3.9,
      200,
      "1556228578-8c89e6adf883"
    ),
    mk(
      "hygiene-perso",
      0,
      "Shampoing anti-pelliculaire",
      "Shampoing conçu pour aider à réduire les pellicules et apaiser le cuir chevelu. Laisse les cheveux propres et légers. Utilisation régulière recommandée.",
      6.9,
      160,
      "1631390060196-8c7f0d52df29"
    ),
    mk(
      "hygiene-perso",
      0,
      "Déodorant 48h",
      "Déodorant longue durée pour une sensation de fraîcheur au quotidien. Application facile et sèche rapidement. Convient pour sport et journées actives.",
      4.9,
      190,
      "1556228578-8c89e6adf883"
    ),
    mk(
      "hygiene-perso",
      0,
      "Coton-tiges 200pcs",
      "Boîte de 200 coton-tiges pour hygiène et petits gestes du quotidien. Tiges résistantes et embouts doux. Format pratique à la maison.",
      2.5,
      200,
      "1608248543803-ba4f8c70ae0b"
    ),
    mk(
      "hygiene-perso",
      0,
      "Savon surgras naturel",
      "Savon surgras naturel, doux pour les peaux sensibles. Laisse une sensation de peau nourrie après lavage. Idéal mains et corps.",
      4.5,
      170,
      "1600857544200-b2f666a9a2ec"
    ),
    mk(
      "hygiene-perso",
      0,
      "Fil dentaire 50m",
      "Fil dentaire 50 m pour compléter le brossage et aider à retirer les résidus. Glisse facilement entre les dents. Indispensable pour une routine complète.",
      3.5,
      180,
      "1606206591513-c85f2dde4f2e"
    ),
    mk(
      "hygiene-perso",
      0,
      "Lotion après-rasage",
      "Lotion après-rasage pour apaiser la peau et réduire les sensations d'irritation. Parfum discret et texture légère. À appliquer après le rasage.",
      7.9,
      140,
      "1563804447979-ac8e7be06570"
    ),
    mk(
      "hygiene-perso",
      0,
      "Coupe-ongles inox",
      "Coupe-ongles en inox, précis et durable. Lame nette pour une coupe propre. Petit format facile à garder dans une trousse.",
      4.9,
      200,
      "1583947215259-38e31be8751f"
    ),

    // MACHINE INDUSTRIELLE
    mk(
      "machine-industrielle",
      0,
      "Perceuse à colonne 500W",
      "Perceuse à colonne 500W pour perçages réguliers et précis. Table ajustable et stabilité renforcée. Adaptée atelier et bricolage avancé.",
      249,
      25,
      "1504148455328-c376907d081c"
    ),
    mk(
      "machine-industrielle",
      0,
      "Compresseur d'air 50L",
      "Compresseur 50L pour outils pneumatiques, gonflage et nettoyage. Réservoir pratique pour un débit stable. Idéal garage et atelier.",
      179,
      30,
      "1558618666-fcd25c85cd64"
    ),
    mk(
      "machine-industrielle",
      0,
      "Générateur 3kW",
      "Générateur 3kW pour alimentation de secours et chantiers. Puissance adaptée aux outils courants et équipements essentiels. Conception robuste.",
      399,
      18,
      "1504328345606-18bbc8c9d7d1"
    ),
    mk(
      "machine-industrielle",
      0,
      "Soudeur à l'arc 200A",
      "Poste à souder 200A pour travaux acier et petites réparations. Réglages simples et arc stable. Convient atelier et chantier selon usage.",
      219,
      22,
      "1565193566173-7a0ee3dbe261"
    ),
    mk(
      "machine-industrielle",
      0,
      "Pompe à eau 1HP",
      "Pompe à eau 1HP pour arrosage, transfert et usages domestiques. Débit régulier et installation simple. Idéale jardin et réservoir.",
      129,
      40,
      "1558618666-fcd25c85cd64"
    ),
    mk(
      "machine-industrielle",
      0,
      "Broyeur végétaux 2500W",
      "Broyeur de végétaux 2500W pour réduire branches et déchets verts. Permet de composter plus facilement et de gagner de la place. Utilisation sécurisée.",
      149,
      35,
      "1416879595882-3373a0480b5b"
    ),
    mk(
      "machine-industrielle",
      0,
      "Tronçonneuse 45cm",
      "Tronçonneuse avec guide 45 cm pour coupe de bois et entretien du jardin. Prise en main stable et coupe efficace. Prévoir équipements de protection.",
      169,
      28,
      "1416879595882-3373a0480b5b"
    ),
    mk(
      "machine-industrielle",
      0,
      "Meuleuse 125mm",
      "Meuleuse 125 mm pour découpe et ponçage sur métal et matériaux compatibles. Format maniable et puissance adaptée. Parfaite pour atelier.",
      39.9,
      90,
      "1504148455328-c376907d081c"
    ),
    mk(
      "machine-industrielle",
      0,
      "Tour à bois 550W",
      "Tour à bois 550W pour tournage de pièces décoratives et projets d'atelier. Réglage de vitesse et support stable. Idéal pour débuter et progresser.",
      299,
      14,
      "1504148455328-c376907d081c"
    ),
    mk(
      "machine-industrielle",
      0,
      "Groupe électrogène diesel",
      "Groupe électrogène diesel pour une autonomie élevée et une puissance stable. Conçu pour usage prolongé sur site ou secours. Châssis robuste pour transport.",
      899,
      12,
      "1504328345606-18bbc8c9d7d1"
    ),

    // MAISON
    mk(
      "maison",
      0,
      "Aspirateur robot Roomba",
      "Aspirateur robot pour nettoyer automatiquement sols et tapis du quotidien. Programmation simple et retour à la base de charge. Idéal pour gagner du temps.",
      279,
      45,
      "1558317374-067fb5f30001"
    ),
    mk(
      "maison",
      0,
      "Cafetière programmable",
      "Cafetière programmable pour préparer le café à l'heure souhaitée. Carafe pratique et maintien au chaud selon modèle. Parfaite pour les matins pressés.",
      49.9,
      120,
      "1495474472287-4d71bcdd2085"
    ),
    mk(
      "maison",
      0,
      "Fer à repasser vapeur",
      "Fer à repasser vapeur pour défroisser rapidement chemises et textiles. Débit vapeur efficace et semelle glissante. Réservoir simple à remplir.",
      34.9,
      140,
      "1558618047-3c8c76ca7d13"
    ),
    mk(
      "maison",
      0,
      "Ventilateur tour 40W",
      "Ventilateur tour 40W compact et silencieux pour rafraîchir une pièce. Plusieurs vitesses et oscillation pour une meilleure diffusion. Idéal en été.",
      39.9,
      90,
      "1558618047-3c8c76ca7d13"
    ),
    mk(
      "maison",
      0,
      "Ampoule LED 10W",
      "Ampoule LED 10W économique et durable. Éclairage confortable pour salon, chambre ou bureau. Installation simple sur douille standard.",
      3.5,
      200,
      "1565814329452-e1efa11ef3e3"
    ),
    mk(
      "maison",
      0,
      "Rideau occultant 140x260",
      "Rideau occultant 140x260 pour réduire la lumière et préserver l'intimité. Tissu épais, tombé élégant. Idéal chambre et salon.",
      24.9,
      150,
      "1558618047-3c8c76ca7d13"
    ),
    mk(
      "maison",
      0,
      "Coussin décoratif 45x45",
      "Coussin décoratif 45x45 pour apporter une touche cosy au canapé. Housse douce et facile à assortir. Parfait pour déco salon ou chambre.",
      12.9,
      180,
      "1586105251261-72a756497a11"
    ),
    mk(
      "maison",
      0,
      "Bougie parfumée lavande",
      "Bougie parfumée à la lavande pour une ambiance relaxante. Diffusion douce et régulière. Idéale pour détente et décoration.",
      9.9,
      170,
      "1602143407151-7111542de6e8"
    ),
    mk(
      "maison",
      0,
      "Cadre photo 30x40",
      "Cadre photo 30x40 pour afficher souvenirs et affiches. Design simple et facile à intégrer. Fixation murale ou pose selon modèle.",
      14.9,
      160,
      "1513519245088-0e12902e5a38"
    ),
    mk(
      "maison",
      0,
      "Tapis salon 160x230",
      "Tapis de salon 160x230 pour réchauffer la pièce et structurer l'espace. Toucher agréable et entretien simple. Idéal sous table basse.",
      79.9,
      80,
      "1586023492125-27b2c045efd7"
    ),

    // MÉDICAL & SANTÉ
    mk(
      "medical-sante",
      4,
      "Tensiomètre électronique",
      "Tensiomètre électronique pour suivi de la tension à domicile. Lecture claire et utilisation simple. Idéal pour un contrôle régulier.",
      34.9,
      90,
      "1559757148-5c350d0d3c56"
    ),
    mk(
      "medical-sante",
      4,
      "Thermomètre infrarouge",
      "Thermomètre infrarouge pour mesure rapide sans contact. Pratique pour famille et usage quotidien. Écran lisible et prise de mesure rapide.",
      24.9,
      120,
      "1584308666744-24d5c474f2ae"
    ),
    mk(
      "medical-sante",
      4,
      "Oxymètre de pouls",
      "Oxymètre de pouls compact pour mesurer SpO2 et fréquence cardiaque. Utilisation simple avec affichage immédiat. Pratique à la maison ou en déplacement.",
      19.9,
      150,
      "1576091160550-2173dba999ef"
    ),
    mk(
      "medical-sante",
      4,
      "Masque chirurgical 50pcs",
      "Boîte de 50 masques pour usage quotidien. Confortables et adaptés aux déplacements. Format pratique pour la maison ou le bureau.",
      7.9,
      200,
      "1584634731339-252c581abfc5"
    ),
    mk(
      "medical-sante",
      4,
      "Gants latex 100pcs",
      "Boîte de 100 gants latex pour hygiène, nettoyage et petits soins. Bonne sensibilité et protection. Usage unique.",
      9.9,
      180,
      "1584308666744-24d5c474f2ae"
    ),
    mk(
      "medical-sante",
      4,
      "Bandage élastique",
      "Bandage élastique pour maintien et compression légère. Idéal sport et petits bobos. Réutilisable et facile à ajuster.",
      4.9,
      170,
      "1583947215259-38e31be8751f"
    ),
    mk(
      "medical-sante",
      4,
      "Stéthoscope",
      "Stéthoscope pour écoute de base en formation ou usage non critique. Confort d'utilisation et embouts adaptés. Accessoire classique du médical.",
      24.9,
      80,
      "1505751172876-fa1923c5c528"
    ),
    mk(
      "medical-sante",
      4,
      "Glucomètre",
      "Glucomètre pour suivre la glycémie avec bandelettes compatibles. Utilisation simple et résultat rapide. Conçu pour un suivi régulier à domicile.",
      29.9,
      70,
      "1559757148-5c350d0d3c56"
    ),
    mk(
      "medical-sante",
      4,
      "Coussin lombaire",
      "Coussin lombaire pour améliorer le maintien au bureau ou en voiture. Soulage la zone du bas du dos en posture assise. Housse agréable et facile à poser.",
      19.9,
      140,
      "1540497077202-7c8a3999166f"
    ),
    mk(
      "medical-sante",
      4,
      "Semelle orthopédique",
      "Semelles pour améliorer le confort de marche et l'amorti. Adaptées à une utilisation quotidienne. À glisser dans chaussures de ville ou sport.",
      14.9,
      160,
      "1542291026-7eec264c27ff"
    ),

    // MEUBLES
    mk(
      "meubles",
      2,
      "Bureau en bois 120cm",
      "Bureau en bois 120 cm pour télétravail et étude. Plateau spacieux et structure stable. Style sobre facile à intégrer.",
      129,
      40,
      "1518455027359-f3f8164ba6bd"
    ),
    mk(
      "meubles",
      2,
      "Chaise ergonomique",
      "Chaise ergonomique pour un meilleur confort au bureau. Dossier soutenant et réglages selon modèle. Idéale pour longues sessions.",
      149,
      35,
      "1580480055273-228ff5388ef8"
    ),
    mk(
      "meubles",
      2,
      "Étagère murale 80cm",
      "Étagère murale 80 cm pour livres, déco ou rangement. Fixations simples et design minimaliste. Parfaite pour optimiser l'espace.",
      29.9,
      120,
      "1555041469-b8f3-45e5-85f1-78a4a4d4e9f9"
    ),
    mk(
      "meubles",
      2,
      "Table basse salon",
      "Table basse pour salon, pratique pour magazines et objets du quotidien. Finition soignée et structure stable. S'accorde avec de nombreux styles.",
      69.9,
      60,
      "1555041469-b8f3-45e5-85f1-78a4a4d4e9f9"
    ),
    mk(
      "meubles",
      2,
      "Lit 160x200",
      "Lit 160x200 pour un confort deux places. Structure stable et design épuré. Parfait pour chambre principale.",
      249,
      18,
      "1555041469-b8f3-45e5-85f1-78a4a4d4e9f9"
    ),
    mk(
      "meubles",
      2,
      "Armoire 3 portes",
      "Armoire 3 portes avec penderie et étagères pour organiser vêtements. Grande capacité et ouverture pratique. Idéale chambre ou dressing.",
      299,
      15,
      "1595428774223-ef52624120d2"
    ),
    mk(
      "meubles",
      2,
      "Tabouret bar métal",
      "Tabouret de bar en métal au style industriel. Assise confortable et structure robuste. Idéal cuisine ou coin bar.",
      49.9,
      70,
      "1506439773649-6e0eb8cfb237"
    ),
    mk(
      "meubles",
      2,
      "Canapé 3 places",
      "Canapé 3 places confortable pour salon. Assise accueillante et tissu résistant. Parfait pour recevoir et se détendre.",
      499,
      12,
      "1555041469-b8f3-45e5-85f1-78a4a4d4e9f9"
    ),
    mk(
      "meubles",
      2,
      "Commode 5 tiroirs",
      "Commode 5 tiroirs pour rangement vêtements et accessoires. Tiroirs fluides et design simple. Idéale chambre ou entrée.",
      119,
      25,
      "1595428774223-ef52624120d2"
    ),
    mk(
      "meubles",
      2,
      "Bibliothèque 6 cases",
      "Bibliothèque 6 cases modulable pour livres et déco. Structure stable et format pratique. Convient salon, bureau ou chambre.",
      79.9,
      45,
      "1555041469-b8f3-45e5-85f1-78a4a4d4e9f9"
    ),

    // PARENT, ENFANT & JOUETS
    mk(
      "parent-enfant-jouet",
      0,
      "Poussette 3 roues",
      "Poussette 3 roues conçue pour une bonne maniabilité. Confort de l'assise et pliage pratique selon modèle. Idéale pour sorties en ville.",
      199,
      25,
      "1591637333184-19aa84b3e01f"
    ),
    mk(
      "parent-enfant-jouet",
      0,
      "Siège auto",
      "Siège auto pour enfant avec maintien et protections latérales. Installation simple selon norme et réglages pratiques. Conçu pour trajets quotidiens.",
      129,
      40,
      "1591637333184-19aa84b3e01f"
    ),
    mk(
      "parent-enfant-jouet",
      0,
      "Lit parapluie",
      "Lit parapluie compact pour déplacements et nuits hors maison. Montage rapide et sac de transport. Confort adapté pour bébé.",
      59.9,
      60,
      "1566004100631-35d015d6a491"
    ),
    mk(
      "parent-enfant-jouet",
      0,
      "Baby monitor vidéo",
      "Baby monitor vidéo pour surveiller bébé à distance. Image claire et son fiable selon modèle. Pratique pour chambre et siestes.",
      79.9,
      55,
      "1566004100631-35d015d6a491"
    ),
    mk(
      "parent-enfant-jouet",
      0,
      "Lego 500pcs",
      "Boîte de construction 500 pièces pour stimuler créativité et imagination. Compatible avec de nombreuses créations. Parfait pour enfants et famille.",
      39.9,
      80,
      "1587654780291-39c9404d746b"
    ),
    mk(
      "parent-enfant-jouet",
      0,
      "Peluche ours 40cm",
      "Peluche ours 40 cm douce et réconfortante. Coutures solides et toucher agréable. Idéale en cadeau.",
      19.9,
      140,
      "1558618666-fcd25c85cd64"
    ),
    mk(
      "parent-enfant-jouet",
      0,
      "Trottinette enfant",
      "Trottinette enfant stable et facile à prendre en main. Guidon ajustable selon modèle et roues résistantes. Idéale pour jouer dehors.",
      29.9,
      120,
      "1558969479-b7e2e2b89cba"
    ),
    mk(
      "parent-enfant-jouet",
      0,
      "Puzzle 100 pièces",
      "Puzzle 100 pièces pour développer concentration et motricité. Illustrations attrayantes et pièces solides. Activité calme en famille.",
      9.9,
      180,
      "1587654780291-39c9404d746b"
    ),
    mk(
      "parent-enfant-jouet",
      0,
      "Vélo enfant 16\"",
      "Vélo enfant 16 pouces pour apprentissage et balades. Freins adaptés et cadre stable. Parfait pour les premières sorties.",
      129,
      35,
      "1558969479-b7e2e2b89cba"
    ),
    mk(
      "parent-enfant-jouet",
      0,
      "Monopoly",
      "Jeu de société classique pour jouer en famille ou entre amis. Règles simples et parties conviviales. Idéal pour soirées à la maison.",
      29.9,
      90,
      "1632501641765-e568d28b0015"
    ),

    // PIÈCES DÉTACHÉES
    mk(
      "pieces-detachees",
      0,
      "Filtre à huile universel",
      "Filtre à huile universel pour entretien automobile selon compatibilité. Aide à garder une huile propre et prolonger la durée de vie du moteur. À remplacer selon intervalle.",
      9.9,
      150,
      "1486262715619-67b85e0b08d3"
    ),
    mk(
      "pieces-detachees",
      0,
      "Batterie voiture 60Ah",
      "Batterie 60Ah pour démarrage fiable par temps froid. Conçue pour la plupart des véhicules compatibles. À installer en respectant polarité et dimensions.",
      89.9,
      40,
      "1558618666-fcd25c85cd64"
    ),
    mk(
      "pieces-detachees",
      0,
      "Plaquettes de frein",
      "Jeu de plaquettes de frein pour un freinage efficace (selon compatibilité). Matériaux conçus pour réduire l'usure et le bruit. Remplacement conseillé en atelier.",
      29.9,
      80,
      "1486262715619-67b85e0b08d3"
    ),
    mk(
      "pieces-detachees",
      0,
      "Courroie distribution",
      "Courroie de distribution pour entretien moteur selon modèle. Pièce essentielle à remplacer selon préconisations. À monter par un professionnel.",
      49.9,
      60,
      "1486262715619-67b85e0b08d3"
    ),
    mk(
      "pieces-detachees",
      0,
      "Ampoule H7 LED",
      "Ampoule H7 LED pour améliorer visibilité (selon compatibilité). Installation simple et éclairage plus blanc. Vérifier homologation selon usage.",
      19.9,
      120,
      "1565814329452-e1efa11ef3e3"
    ),
    mk(
      "pieces-detachees",
      0,
      "Essuie-glace 60cm",
      "Balai d'essuie-glace 60 cm pour une meilleure évacuation de l'eau. Remplacement rapide et compatibilité à vérifier. Idéal avant saison pluvieuse.",
      9.9,
      160,
      "1486262715619-67b85e0b08d3"
    ),
    mk(
      "pieces-detachees",
      0,
      "Bougie d'allumage NGK",
      "Bougie d'allumage NGK pour améliorer l'allumage et la stabilité moteur (selon compatibilité). Pièce d'entretien courant. À remplacer selon intervalle.",
      8.9,
      180,
      "1558618666-fcd25c85cd64"
    ),
    mk(
      "pieces-detachees",
      0,
      "Filtre à air",
      "Filtre à air pour limiter l'entrée de poussières dans le moteur. Aide à conserver de bonnes performances. Remplacement simple selon modèle.",
      14.9,
      140,
      "1558618666-fcd25c85cd64"
    ),
    mk(
      "pieces-detachees",
      0,
      "Radiateur aluminium",
      "Radiateur en aluminium pour circuit de refroidissement (selon compatibilité). Dissipation efficace de la chaleur. Installation recommandée en atelier.",
      119,
      20,
      "1486262715619-67b85e0b08d3"
    ),
    mk(
      "pieces-detachees",
      0,
      "Huile moteur 5W40 5L",
      "Huile moteur 5W40 5L pour entretien selon préconisations. Bonne protection à chaud et à froid. À utiliser avec filtre adapté.",
      29.9,
      90,
      "1486262715619-67b85e0b08d3"
    ),

    // PRODUITS BEAUTÉ
    mk(
      "beaute",
      0,
      "Fond de teint L'Oréal",
      "Fond de teint au fini naturel pour unifier le teint. Texture facile à appliquer et couvrance modulable. Idéal pour maquillage quotidien.",
      12.9,
      160,
      "1596462502278-27bfdc403347"
    ),
    mk(
      "beaute",
      0,
      "Mascara waterproof",
      "Mascara waterproof pour une tenue longue durée. Allonge et définit les cils sans couler facilement. Parfait pour journées actives.",
      9.9,
      190,
      "1512496015851-a90fb38ba796"
    ),
    mk(
      "beaute",
      0,
      "Rouge à lèvres mat",
      "Rouge à lèvres mat pour une couleur intense. Texture confortable et application précise. Tenue adaptée aux sorties et au quotidien.",
      8.9,
      170,
      "1586495777744-4e6b8f919d04"
    ),
    mk(
      "beaute",
      0,
      "Palette fards à paupières",
      "Palette de fards avec teintes polyvalentes pour looks naturels ou plus marqués. Pigmentation équilibrée et estompage facile. Idéale pour tous niveaux.",
      19.9,
      140,
      "1512496015851-a90fb38ba796"
    ),
    mk(
      "beaute",
      0,
      "Crème SPF50",
      "Crème solaire SPF50 pour protéger la peau au quotidien. Texture légère adaptée visage selon formule. Indispensable en été et en ville.",
      14.9,
      150,
      "1556228578-8c89e6adf883"
    ),
    mk(
      "beaute",
      0,
      "Sérum vitamine C",
      "Sérum vitamine C pour illuminer et uniformiser le teint. Texture légère et absorption rapide. À intégrer dans une routine du matin.",
      16.9,
      120,
      "1620916566398-39f1143ab7be"
    ),
    mk(
      "beaute",
      0,
      "Huile d'argan 100ml",
      "Huile d'argan 100ml pour nourrir peau et cheveux. Quelques gouttes suffisent pour un effet doux et brillant. Idéale routine beauté.",
      9.9,
      160,
      "1526045612212-70caf35c14df"
    ),
    mk(
      "beaute",
      0,
      "Vernis gel",
      "Vernis gel pour une brillance et une tenue améliorées. Application en couches fines pour un rendu uniforme. Idéal manucure à la maison.",
      7.9,
      180,
      "1604654894610-df63bc536371"
    ),
    mk(
      "beaute",
      0,
      "Démaquillant micellaire",
      "Eau micellaire pour démaquiller visage et yeux en douceur. Nettoie sans tiraillements. Parfait en routine du soir.",
      6.9,
      190,
      "1556228578-8c89e6adf883"
    ),
    mk(
      "beaute",
      0,
      "Crayon khôl noir",
      "Crayon khôl noir pour intensifier le regard. Application facile et tracé net. Idéal pour maquillage quotidien ou soirée.",
      4.9,
      200,
      "1512496015851-a90fb38ba796"
    ),

    // SPORT & LOISIRS
    mk(
      "sport-loisirs",
      2,
      "Ballon football Nike",
      "Ballon de football durable pour entraînements et matchs loisirs. Bon toucher et coutures solides. Adapté terrain et utilisation régulière.",
      24.9,
      120,
      "1575361204480-aadea25e6e68"
    ),
    mk(
      "sport-loisirs",
      2,
      "Tapis yoga 6mm",
      "Tapis de yoga 6 mm avec bon amorti. Surface antidérapante pour postures stables. Facile à rouler et transporter.",
      19.9,
      160,
      "1544367567-0f2fcb009e0b"
    ),
    mk(
      "sport-loisirs",
      2,
      "Haltères 10kg",
      "Paire d'haltères 10 kg pour renforcement musculaire à la maison. Prise en main sûre et matériau durable. Idéal pour entraînement complet.",
      39.9,
      80,
      "1534438327276-14e5300c3a48"
    ),
    mk(
      "sport-loisirs",
      2,
      "Corde à sauter",
      "Corde à sauter pour cardio simple et efficace. Longueur ajustable selon modèle. Idéale échauffement et entraînements rapides.",
      9.9,
      190,
      "1434682881908-b43d0467b798"
    ),
    mk(
      "sport-loisirs",
      2,
      "Gants de boxe",
      "Gants de boxe pour entraînement sac et sparring léger. Bon maintien du poignet et rembourrage adapté. Pour débutant ou confirmé.",
      34.9,
      90,
      "1616803689943-5601631c7fec"
    ),
    mk(
      "sport-loisirs",
      2,
      "Raquette tennis",
      "Raquette de tennis polyvalente pour loisir et progression. Bon équilibre puissance/contrôle. Confort de frappe pour sessions régulières.",
      59.9,
      70,
      "1551698618-1dfe5d97d256"
    ),
    mk(
      "sport-loisirs",
      2,
      "Vélo elliptique",
      "Vélo elliptique pour cardio à domicile avec faible impact. Résistance réglable et suivi de base selon modèle. Idéal remise en forme.",
      299,
      15,
      "1534258936925-c58bed479fcb"
    ),
    mk(
      "sport-loisirs",
      2,
      "Tente camping 2 places",
      "Tente 2 places pour camping, montage simple et structure stable. Protection contre l'humidité selon usage. Parfaite week-ends nature.",
      49.9,
      60,
      "1504280390367-361c6d9f38f4"
    ),
    mk(
      "sport-loisirs",
      2,
      "Sac de couchage -5°C",
      "Sac de couchage conçu pour températures fraîches jusqu'à -5°C (selon conditions). Confort thermique et rangement compact. Idéal camping et trek.",
      59.9,
      45,
      "1504280390367-361c6d9f38f4"
    ),
    mk(
      "sport-loisirs",
      0,
      "Montre GPS running",
      "Montre GPS pour suivre parcours, rythme et séances. Synchronisation simple et métriques utiles. Idéale course à pied et sport outdoor.",
      149,
      55,
      "1508685096489-7aacd43bd3b1"
    ),

    // TENUE SPORT
    mk(
      "tenue-sport",
      2,
      "Legging sport femme",
      "Legging sport avec tissu extensible et respirant. Taille confortable et maintien adapté. Idéal yoga, fitness et running.",
      24.9,
      120,
      "1506629082955-511b1aa562c8"
    ),
    mk(
      "tenue-sport",
      2,
      "Short running homme",
      "Short running léger pour liberté de mouvement. Tissu respirant et séchage rapide. Parfait pour entraînement et sorties.",
      19.9,
      140,
      "1556906781-9a8f6c0f0a88"
    ),
    mk(
      "tenue-sport",
      2,
      "Maillot de bain",
      "Maillot de bain confortable pour piscine ou plage. Matière résistante au chlore selon usage. Coupe pratique et durable.",
      14.9,
      160,
      "1570347347184-b2499f3b2d8b"
    ),
    mk(
      "tenue-sport",
      2,
      "Veste coupe-vent",
      "Veste coupe-vent légère pour sorties par temps frais. Protège du vent et de la petite pluie. Se range facilement dans un sac.",
      34.9,
      100,
      "1539101320-2b6c16b85ea9"
    ),
    mk(
      "tenue-sport",
      2,
      "Chaussettes compression",
      "Chaussettes de compression pour améliorer le confort pendant l'effort. Maintien du mollet et réduction de fatigue. Idéales running et randonnée.",
      12.9,
      150,
      "1506629082955-511b1aa562c8"
    ),
    mk(
      "tenue-sport",
      2,
      "Brassière sport",
      "Brassière sport offrant maintien et confort. Tissu respirant et bretelles adaptées. Idéale fitness, HIIT et course.",
      19.9,
      140,
      "1518310383802-640c2de311b2"
    ),
    mk(
      "tenue-sport",
      2,
      "T-shirt Dri-Fit",
      "T-shirt technique pour évacuer la transpiration. Coupe confortable pour entraînement. Idéal sport en salle ou extérieur.",
      19.9,
      160,
      "1521572163474-6864f9cf17ab"
    ),
    mk(
      "tenue-sport",
      2,
      "Jogging coton homme",
      "Jogging coton confortable pour sport léger et détente. Taille ajustable et tissu doux. Parfait au quotidien.",
      24.9,
      120,
      "1556906781-9a8f6c0f0a88"
    ),
    mk(
      "tenue-sport",
      2,
      "Bonnet natation silicone",
      "Bonnet de natation en silicone pour protéger les cheveux et réduire la résistance. Confortable et facile à enfiler. Idéal piscine.",
      7.9,
      200,
      "1530549387789-4c1017266635"
    ),
    mk(
      "tenue-sport",
      2,
      "Gants musculation",
      "Gants de musculation pour améliorer la prise et protéger les mains. Paume renforcée et fermeture ajustable. Idéal haltères et machines.",
      14.9,
      170,
      "1534258936925-c58bed479fcb"
    ),

    // VÉHICULE & TRANSPORT
    mk(
      "vehicule-transport",
      0,
      "Trottinette électrique 350W",
      "Trottinette électrique 350W pour trajets urbains. Pliage pratique et autonomie adaptée au quotidien selon usage. Conçue pour mobilité simple.",
      349,
      25,
      "1558981403-c5f9899a28bc"
    ),
    mk(
      "vehicule-transport",
      0,
      "Vélo électrique 250W",
      "Vélo électrique 250W pour déplacements confortables en ville. Assistance fluide et autonomie selon batterie. Idéal pour trajets réguliers.",
      899,
      12,
      "1571068316344-75bc76f77890"
    ),
    mk(
      "vehicule-transport",
      0,
      "Casque moto intégral",
      "Casque intégral pour une meilleure protection et confort sur route. Visière claire et ventilation selon modèle. À choisir à la bonne taille.",
      129,
      40,
      "1558981806-ec527fa84c39"
    ),
    mk(
      "vehicule-transport",
      0,
      "Antivol U vélo",
      "Antivol en U robuste pour sécuriser vélo et trottinette. Acier renforcé et support de transport selon modèle. Indispensable en ville.",
      29.9,
      150,
      "1571068316344-75bc76f77890"
    ),
    mk(
      "vehicule-transport",
      0,
      "GPS voiture",
      "GPS voiture avec écran lisible et guidage clair. Cartographie et itinéraires selon modèle. Pratique pour trajets et voyages.",
      79.9,
      60,
      "1558618666-fcd25c85cd64"
    ),
    mk(
      "vehicule-transport",
      0,
      "Siège vélo enfant",
      "Siège vélo enfant pour balades en toute sécurité. Fixation stable et sangles confortables. À utiliser avec casque adapté.",
      49.9,
      70,
      "1571068316344-75bc76f77890"
    ),
    mk(
      "vehicule-transport",
      0,
      "Gonfleur électrique",
      "Gonfleur électrique portable pour pneus et ballons. Affichage de pression et arrêt automatique selon modèle. Très pratique en déplacement.",
      34.9,
      120,
      "1486262715619-67b85e0b08d3"
    ),
    mk(
      "vehicule-transport",
      0,
      "Dashcam Full HD",
      "Dashcam Full HD pour enregistrer la route. Installation simple et enregistrement en boucle selon modèle. Utile pour sécurité et preuves.",
      49.9,
      80,
      "1558618666-fcd25c85cd64"
    ),
    mk(
      "vehicule-transport",
      0,
      "Support téléphone voiture",
      "Support téléphone voiture stable pour navigation. Fixation sur grille ou pare-brise selon modèle. Réglage facile et maintien sécurisé.",
      12.9,
      200,
      "1486262715619-67b85e0b08d3"
    ),
    mk(
      "vehicule-transport",
      0,
      "Housse voiture",
      "Housse de voiture pour protéger de la poussière et des intempéries légères. Tissu résistant et élastiques de maintien. Idéale pour stationnement prolongé.",
      29.9,
      90,
      "1503376780353-7e6692767b70"
    ),

    // VÊTEMENTS
    mk(
      "vetements",
      2,
      "T-shirt col rond coton",
      "T-shirt col rond en coton pour un usage quotidien. Coupe confortable et tissu doux. Idéal pour superposer ou porter seul.",
      12.9,
      200,
      "1521572163474-6864f9cf17ab"
    ),
    mk(
      "vetements",
      2,
      "Jean slim homme",
      "Jean slim pour un style moderne et ajusté. Tissu confortable avec légère élasticité. Parfait pour tenue casual.",
      39.9,
      120,
      "1542272604-787c3835535d"
    ),
    mk(
      "vetements",
      2,
      "Robe d'été fleurie",
      "Robe d'été fleurie légère et agréable à porter. Coupe fluide pour les journées chaudes. Idéale sorties et vacances.",
      29.9,
      90,
      "1515886657613-9f3515b0c78f"
    ),
    mk(
      "vetements",
      2,
      "Chemise oxford bleue",
      "Chemise oxford bleue au style élégant et polyvalent. Tissu résistant, idéale bureau ou sorties. Se porte facilement avec jean ou chino.",
      34.9,
      80,
      "1598033129183-c4f50c736f10"
    ),
    mk(
      "vetements",
      2,
      "Pull cachemire femme",
      "Pull cachemire doux et chaud pour l'hiver. Finition soignée et confort premium. Parfait pour une tenue chic.",
      99.9,
      40,
      "1576566588028-4147f3842f27"
    ),
    mk(
      "vetements",
      2,
      "Blazer homme",
      "Blazer homme pour un look habillé sans effort. Coupe moderne et tissu confortable. Idéal bureau, événements et sorties.",
      79.9,
      55,
      "1507003211169-0a1dd7228f2d"
    ),
    mk(
      "vetements",
      2,
      "Jupe mi-longue",
      "Jupe mi-longue facile à assortir, coupe élégante. Confortable pour la journée. Idéale pour bureau ou sorties.",
      24.9,
      100,
      "1515886657613-9f3515b0c78f"
    ),
    mk(
      "vetements",
      2,
      "Manteau laine femme",
      "Manteau en laine pour rester au chaud tout en gardant une silhouette élégante. Finition soignée et coupe confortable. Parfait en hiver.",
      129,
      30,
      "1539109136881-3be0616acf4b"
    ),
    mk(
      "vetements",
      2,
      "Short bermuda",
      "Short bermuda confortable pour l'été. Coupe simple et tissu agréable. Idéal vacances et sorties.",
      19.9,
      140,
      "1591195853828-11db59a44f43"
    ),
    mk(
      "vetements",
      2,
      "Robe de soirée noire",
      "Robe de soirée noire élégante pour occasions spéciales. Coupe flatteuse et finition soignée. Parfaite pour événements et cérémonies.",
      69.9,
      60,
      "1566174053879-31528523f8ae"
    ),
  ];

  const createdProducts: { id: string; slug: string }[] = [];

  for (let i = 0; i < productDefs.length; i++) {
    const pd = productDefs[i];
    const images = JSON.stringify([pd.imageUrl]);
    const crossSellIds = i > 0 ? [createdProducts[Math.max(0, i - 2)]?.id].filter(Boolean) : [];
    const p = await prisma.product.create({
      data: {
        sellerId: sellerUser.id,
        categoryId: getCat(pd.catSlug),
        brandId: b(pd.brandIdx),
        name: pd.name,
        slug: pd.slug,
        description: pd.description,
        price: pd.price,
        comparePrice: pd.comparePrice,
        stock: pd.stock,
        images,
        isPromo: true,
        promoPercent: Math.round(((pd.comparePrice - pd.price) / pd.comparePrice) * 100),
        crossSellIds: JSON.stringify(crossSellIds),
      },
    });
    createdProducts.push({ id: p.id, slug: p.slug });
  }

  // (On garde l’upsell si les slugs existent dans le seed)
  const m5 = createdProducts.find((p) => p.slug === "iphone-15-pro");
  const m5pro = createdProducts.find((p) => p.slug === "samsung-galaxy-s24");
  if (m5 && m5pro) {
    await prisma.product.update({
      where: { id: m5pro.id },
      data: { upsellOfId: m5.id },
    });
  }

  const promoWelcome = await prisma.promoCode.create({
    data: {
      code: "NEXORA10",
      kind: "PERCENT",
      value: 10,
      minCart: 40,
      active: true,
    },
  });

  await prisma.rewardCatalog.create({
    data: {
      title: "Code -10% fidélité",
      costPoints: 500,
      promoCodeId: promoWelcome.id,
      active: true,
    },
  });

  const phoneId = createdProducts.find((p) => p.slug === "iphone-15-pro")!.id;
  const casqueId = createdProducts.find((p) => p.slug === "ecouteurs-bluetooth-airpods")!.id;

  await prisma.review.createMany({
    data: [
      {
        productId: phoneId,
        userId: uMarie.id,
        rating: 5,
        comment:
          "Livraison rapide, téléphone fluide pour le quotidien et les photos.",
      },
      {
        productId: phoneId,
        userId: uJean.id,
        rating: 4,
        comment: "Bon rapport qualité-prix, je recommande pour le travail.",
      },
      {
        productId: casqueId,
        userId: uSara.id,
        rating: 5,
        comment: "ANC impressionnante pour le prix, confortable en vol.",
      },
      {
        productId: casqueId,
        userId: uTom.id,
        rating: 4,
        comment: "Son équilibré, l’appli est un peu basique mais ça suffit.",
      },
      {
        productId: createdProducts.find((p) => p.slug === "t-shirt-col-rond-coton")!.id,
        userId: uMarie.id,
        rating: 5,
        comment: "Tissu doux, taille conforme au guide.",
      },
      {
        productId: createdProducts.find((p) => p.slug === "baskets-nike-air-max")!.id,
        userId: uTom.id,
        rating: 5,
        comment: "Parfaites pour le footing, bon maintien de la cheville.",
      },
    ],
  });

  const faqCat = await prisma.faqCategory.create({
    data: { name: "Commandes", slug: "commandes" },
  });
  await prisma.faqItem.createMany({
    data: [
      {
        categoryId: faqCat.id,
        question: "Comment suivre ma commande ?",
        answer:
          "Depuis votre compte > Mes commandes, ou via la page suivi avec votre numéro.",
        sortOrder: 1,
      },
      {
        categoryId: faqCat.id,
        question: "Puis-je modifier l’adresse après paiement ?",
        answer: "Contactez le support rapidement : tant que la commande n’est pas expédiée, nous adaptons.",
        sortOrder: 2,
      },
    ],
  });

  await prisma.homeSection.createMany({
    data: [
      { title: "Hero & promos", key: "hero", sortOrder: 0, visible: true },
      { title: "Catégories", key: "categories", sortOrder: 1, visible: true },
      { title: "Ventes flash", key: "flash", sortOrder: 2, visible: true },
      { title: "Recommandé pour vous", key: "reco_home", sortOrder: 3, visible: true },
      { title: "Tendances", key: "trending", sortOrder: 4, visible: true },
    ],
  });

  await prisma.platformSetting.createMany({
    data: [
      { key: "site_name", value: "NEXORA" },
      { key: "tagline", value: "Commerce intelligent, expérience premium." },
      { key: "abandoned_cart_hours", value: "24" },
    ],
  });

  await prisma.userBadge.createMany({
    data: [
      { userId: uTom.id, code: "VIP" },
      { userId: uMarie.id, code: "FIRST_PURCHASE" },
      { userId: sellerUser.id, code: "SELLER_OF_MONTH" },
    ],
  });

  console.log(
    `Seed OK — admin: ${adminEmail} / (voir ADMIN_PASSWORD) · vendeur@nexora.com / vendeur123 · clients *@nexora.com / demo123`
  );
  console.log("Transporteurs:", carriers.map((c) => c.code).join(", "));
  console.log("Zones:", zones.map((z) => z.code).join(", "));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
