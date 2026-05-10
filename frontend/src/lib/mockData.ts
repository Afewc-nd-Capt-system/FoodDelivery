export interface MenuItem {
  _id?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isVeg: boolean;
  isAvailable: boolean;
  rating: number;
}

export interface Review {
  _id?: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Restaurant {
  _id: string;
  name: string;
  description: string;
  image: string;
  cuisine: string[];
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  priceForTwo: number;
  priceRange: string;
  address: string;
  location: { city: string; area: string };
  isOpen: boolean;
  offers: string[];
  menu: MenuItem[];
  reviews: Review[];
}

export const mockRestaurants: Restaurant[] = [
  {
    _id: '1',
    name: 'Spice Garden',
    description: 'Authentic Indian cuisine with a modern twist. Fresh ingredients and traditional recipes passed down through generations.',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
    cuisine: ['Indian', 'North Indian', 'Mughlai'],
    rating: 4.5,
    reviewCount: 328,
    deliveryTime: '25-35 mins',
    priceForTwo: 600,
    priceRange: '$$',
    address: '123 Main Street, Downtown',
    location: { city: 'Lagos', area: 'Victoria Island' },
    isOpen: true,
    offers: ['30% off up to ₦2000', 'Free delivery on orders over ₦5000'],
    menu: [
      { _id: 'm1', name: 'Butter Chicken', description: 'Tender chicken in rich tomato-butter gravy', price: 3500, image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400', category: 'Main Course', isVeg: false, isAvailable: true, rating: 4.8 },
      { _id: 'm2', name: 'Paneer Tikka Masala', description: 'Grilled cottage cheese in spicy masala gravy', price: 3000, image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400', category: 'Main Course', isVeg: true, isAvailable: true, rating: 4.6 },
      { _id: 'm3', name: 'Garlic Naan', description: 'Fresh baked bread with garlic butter', price: 800, image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400', category: 'Breads', isVeg: true, isAvailable: true, rating: 4.5 },
      { _id: 'm4', name: 'Biryani', description: 'Aromatic basmati rice with spices and meat', price: 4000, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', category: 'Rice', isVeg: false, isAvailable: true, rating: 4.7 },
      { _id: 'm5', name: 'Tandoori Chicken', description: 'Whole chicken marinated and cooked in tandoor', price: 4500, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c17206?w=400', category: 'Starters', isVeg: false, isAvailable: true, rating: 4.7 },
      { _id: 'm6', name: 'Gulab Jamun', description: 'Sweet milk dumplings in rose syrup', price: 1200, image: 'https://images.unsplash.com/photo-1666190077588-16a1fca8e0f4?w=400', category: 'Desserts', isVeg: true, isAvailable: true, rating: 4.6 },
    ],
    reviews: [
      { _id: 'r1', user: 'Sarah M.', rating: 5, comment: 'Best Indian food in the city! The butter chicken is amazing.', date: '2026-04-15' },
      { _id: 'r2', user: 'John D.', rating: 4, comment: 'Great flavors, generous portions. Will order again.', date: '2026-04-10' },
    ],
  },
  {
    _id: '2',
    name: 'Dragon Palace',
    description: 'Premium Chinese cuisine featuring Cantonese, Sichuan, and Hunan specialties. Fresh wok-fired dishes daily.',
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
    cuisine: ['Chinese', 'Asian', 'Thai'],
    rating: 4.3,
    reviewCount: 256,
    deliveryTime: '30-40 mins',
    priceForTwo: 700,
    priceRange: '$$',
    address: '456 Oak Avenue, Chinatown',
    location: { city: 'Lagos', area: 'Lekki Phase 1' },
    isOpen: true,
    offers: ['20% off on first order', 'Combo meals starting at ₦3000'],
    menu: [
      { _id: 'm7', name: 'Kung Pao Chicken', description: 'Spicy stir-fried chicken with peanuts', price: 3500, image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400', category: 'Main Course', isVeg: false, isAvailable: true, rating: 4.5 },
      { _id: 'm8', name: 'Vegetable Chow Mein', description: 'Stir-fried noodles with fresh vegetables', price: 2500, image: 'https://images.unsplash.com/photo-1585032226651-759f2f306c4c?w=400', category: 'Noodles', isVeg: true, isAvailable: true, rating: 4.2 },
      { _id: 'm9', name: 'Dim Sum Platter', description: 'Assorted steamed dumplings (6 pcs)', price: 4000, image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400', category: 'Starters', isVeg: false, isAvailable: true, rating: 4.7 },
      { _id: 'm10', name: 'Sweet Sour Pork', description: 'Crispy pork in tangy sweet sour sauce', price: 3500, image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400', category: 'Main Course', isVeg: false, isAvailable: true, rating: 4.3 },
      { _id: 'm11', name: 'Mapo Tofu', description: 'Silky tofu in spicy Sichuan sauce', price: 2800, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', category: 'Main Course', isVeg: true, isAvailable: true, rating: 4.5 },
      { _id: 'm12', name: 'Mango Pudding', description: 'Smooth and creamy mango dessert', price: 1500, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', category: 'Desserts', isVeg: true, isAvailable: true, rating: 4.2 },
    ],
    reviews: [
      { _id: 'r3', user: 'Mike R.', rating: 5, comment: 'Authentic Chinese flavors. The dim sum is incredible!', date: '2026-04-12' },
      { _id: 'r4', user: 'Lisa T.', rating: 4, comment: 'Good food, fast delivery. Love the Kung Pao Chicken.', date: '2026-04-08' },
    ],
  },
  {
    _id: '3',
    name: 'Bella Italia',
    description: 'Traditional Italian restaurant with handmade pasta, wood-fired pizzas, and authentic Mediterranean flavors.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    cuisine: ['Italian', 'Pizza', 'Pasta'],
    rating: 4.6,
    reviewCount: 412,
    deliveryTime: '35-45 mins',
    priceForTwo: 900,
    priceRange: '$$$',
    address: '789 Pine Road, Little Italy',
    location: { city: 'Lagos', area: 'Ikoyi' },
    isOpen: true,
    offers: ['Free garlic bread with pizza', 'Buy 1 Get 1 on selected pastas'],
    menu: [
      { _id: 'm13', name: 'Margherita Pizza', description: 'Classic pizza with tomato, mozzarella, basil', price: 4000, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400', category: 'Pizza', isVeg: true, isAvailable: true, rating: 4.8 },
      { _id: 'm14', name: 'Pepperoni Pizza', description: 'Loaded with pepperoni and cheese', price: 4500, image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400', category: 'Pizza', isVeg: false, isAvailable: true, rating: 4.7 },
      { _id: 'm15', name: 'Carbonara Pasta', description: 'Creamy pasta with bacon, egg, parmesan', price: 3800, image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400', category: 'Pasta', isVeg: false, isAvailable: true, rating: 4.6 },
      { _id: 'm16', name: 'Tiramisu', description: 'Classic Italian coffee-flavored dessert', price: 2200, image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400', category: 'Desserts', isVeg: true, isAvailable: true, rating: 4.9 },
    ],
    reviews: [
      { _id: 'r5', user: 'Emily W.', rating: 5, comment: 'The pizza is outstanding! Tastes just like Italy.', date: '2026-04-18' },
      { _id: 'r6', user: 'David K.', rating: 4, comment: 'Great pasta dishes. The tiramisu is a must-try!', date: '2026-04-14' },
    ],
  },
  {
    _id: '4',
    name: 'Burger Barn',
    description: 'Gourmet burgers, crispy fries, and milkshakes. Made with premium Angus beef and fresh ingredients.',
    image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800',
    cuisine: ['American', 'Burgers', 'Fast Food'],
    rating: 4.2,
    reviewCount: 189,
    deliveryTime: '20-30 mins',
    priceForTwo: 400,
    priceRange: '$',
    address: '321 Burger Lane, Midtown',
    location: { city: 'Lagos', area: 'Ikeja' },
    isOpen: true,
    offers: ['2 burgers for ₦2500', 'Free fries with combo'],
    menu: [
      { _id: 'm17', name: 'Classic Cheeseburger', description: 'Angus beef patty with cheese, lettuce, tomato', price: 2800, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', category: 'Burgers', isVeg: false, isAvailable: true, rating: 4.5 },
      { _id: 'm18', name: 'Bacon BBQ Burger', description: 'Smoky bacon, cheddar, BBQ sauce', price: 3200, image: 'https://images.unsplash.com/photo-1553979459-d22034812371?w=400', category: 'Burgers', isVeg: false, isAvailable: true, rating: 4.6 },
      { _id: 'm19', name: 'Veggie Burger', description: 'Plant-based patty with avocado and sprouts', price: 3000, image: 'https://images.unsplash.com/photo-1520072958-c39001d3d638?w=400', category: 'Burgers', isVeg: true, isAvailable: true, rating: 4.2 },
      { _id: 'm20', name: 'Loaded Fries', description: 'Crispy fries with cheese, bacon, jalapenos', price: 2000, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', category: 'Sides', isVeg: false, isAvailable: true, rating: 4.4 },
      { _id: 'm21', name: 'Chocolate Milkshake', description: 'Thick and creamy chocolate shake', price: 1800, image: 'https://images.unsplash.com/photo-1572490122747-3968b0cc2d83?w=400', category: 'Beverages', isVeg: true, isAvailable: true, rating: 4.7 },
    ],
    reviews: [
      { _id: 'r7', user: 'Chris P.', rating: 5, comment: 'Best burgers in town! The Bacon BBQ is my favorite.', date: '2026-04-20' },
      { _id: 'r8', user: 'Anna L.', rating: 4, comment: 'Great value for money. Milkshakes are awesome!', date: '2026-04-16' },
    ],
  },
  {
    _id: '5',
    name: 'Sushi Master',
    description: 'Authentic Japanese sushi and ramen. Fresh fish flown in daily, prepared by expert sushi chefs.',
    image: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=800',
    cuisine: ['Japanese', 'Sushi', 'Ramen'],
    rating: 4.7,
    reviewCount: 278,
    deliveryTime: '35-45 mins',
    priceForTwo: 1000,
    priceRange: '$$$',
    address: '555 Sakura Street, Eastside',
    location: { city: 'Lagos', area: 'Victoria Island' },
    isOpen: true,
    offers: ['10% off on orders over ₦10000', 'Free miso soup with sushi orders'],
    menu: [
      { _id: 'm22', name: 'Salmon Nigiri (2 pcs)', description: 'Fresh salmon over seasoned rice', price: 2500, image: 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=400', category: 'Sushi', isVeg: false, isAvailable: true, rating: 4.8 },
      { _id: 'm23', name: 'California Roll (8 pcs)', description: 'Crab, avocado, cucumber, mayo', price: 3000, image: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400', category: 'Sushi', isVeg: false, isAvailable: true, rating: 4.6 },
      { _id: 'm24', name: 'Tonkotsu Ramen', description: 'Rich pork bone broth with chashu and egg', price: 4500, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f623?w=400', category: 'Ramen', isVeg: false, isAvailable: true, rating: 4.9 },
      { _id: 'm25', name: 'Tempura Platter', description: 'Assorted shrimp and vegetable tempura', price: 3800, image: 'https://images.unsplash.com/photo-1615361200211-9a3fbe1d7c50?w=400', category: 'Starters', isVeg: false, isAvailable: true, rating: 4.5 },
    ],
    reviews: [
      { _id: 'r9', user: 'Yuki S.', rating: 5, comment: 'Most authentic Japanese food outside of Japan!', date: '2026-04-22' },
      { _id: 'r10', user: 'Tom H.', rating: 5, comment: 'The ramen is perfection. Fresh fish every time.', date: '2026-04-19' },
    ],
  },
  {
    _id: '6',
    name: 'Taco Fiesta',
    description: 'Vibrant Mexican street food with authentic flavors. Tacos, burritos, quesadillas, and more.',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800',
    cuisine: ['Mexican', 'Latin American', 'Tex-Mex'],
    rating: 4.4,
    reviewCount: 203,
    deliveryTime: '25-35 mins',
    priceForTwo: 500,
    priceRange: '$$',
    address: '888 Salsa Avenue, Westside',
    location: { city: 'Lagos', area: 'Surulere' },
    isOpen: true,
    offers: ['Taco Tuesday: ₦500 tacos', 'Free guacamole with burrito orders'],
    menu: [
      { _id: 'm26', name: 'Chicken Tacos (3 pcs)', description: 'Grilled chicken with salsa, onions, cilantro', price: 2800, image: 'https://images.unsplash.com/photo-1551504734-5ee1c4e1d4f9?w=400', category: 'Tacos', isVeg: false, isAvailable: true, rating: 4.6 },
      { _id: 'm27', name: 'Veggie Burrito', description: 'Beans, rice, veggies, cheese, sour cream', price: 3000, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400', category: 'Burritos', isVeg: true, isAvailable: true, rating: 4.4 },
      { _id: 'm28', name: 'Steak Quesadilla', description: 'Grilled steak with melted cheese and peppers', price: 3500, image: 'https://images.unsplash.com/photo-1618040996336-56904b7850b9?w=400', category: 'Quesadillas', isVeg: false, isAvailable: true, rating: 4.5 },
      { _id: 'm29', name: 'Churros', description: 'Fried dough with cinnamon sugar and chocolate', price: 1500, image: 'https://images.unsplash.com/photo-1624371414361-e670246e0e1a?w=400', category: 'Desserts', isVeg: true, isAvailable: true, rating: 4.7 },
    ],
    reviews: [
      { _id: 'r11', user: 'Maria G.', rating: 5, comment: 'Authentic Mexican flavors! Reminds me of home.', date: '2026-04-21' },
      { _id: 'r12', user: 'Jake M.', rating: 4, comment: 'Great tacos and the nachos are loaded!', date: '2026-04-17' },
    ],
  },
];

export const mockCuisines = [
  'Indian', 'Chinese', 'Italian', 'American', 'Japanese', 'Mexican',
  'Thai', 'Pizza', 'Pasta', 'Burgers', 'Sushi', 'Healthy',
  'Rice', 'Swallow', 'Grills', 'Fast Food', 'Soups', 'Seafood',
];

// ===== NEW ARRAYS FOR VIBECHOPS =====

export interface Vendor {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  rating: number;
  reviewCount: number;
  cuisine: string;
  cookingDays: string[];
  maxOrdersPerDay: number;
  currentOrders: number;
  location: string;
  categories: string[];
  isAvailable: boolean;
}

export const mockVendors: Vendor[] = [
  {
    id: 'v1',
    name: 'Mama Ngozi Home Kitchen',
    avatar: 'MN',
    bio: 'Authentic Igbo home cooking, made fresh every Saturday',
    rating: 4.9,
    reviewCount: 89,
    cuisine: 'Traditional Igbo',
    cookingDays: ['Saturday'],
    maxOrdersPerDay: 12,
    currentOrders: 8,
    location: 'Surulere, Lagos',
    categories: ['Ofe Onugbu', 'Oha Soup', 'Jollof'],
    isAvailable: true,
  },
  {
    id: 'v2',
    name: "Chef Amaka's Kitchen",
    avatar: 'CA',
    bio: 'Premium Yoruba cuisine. Pre-order by Thursday.',
    rating: 4.7,
    reviewCount: 134,
    cuisine: 'Yoruba Traditional',
    cookingDays: ['Friday', 'Saturday'],
    maxOrdersPerDay: 20,
    currentOrders: 12,
    location: 'Yaba, Lagos',
    categories: ['Efo Riro', 'Amala', 'Gbegiri'],
    isAvailable: true,
  },
];

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  balance: number;
}

export const mockWalletTransactions: WalletTransaction[] = [
  { id: 'wt1', type: 'credit', amount: 5000, description: 'Wallet top-up', date: 'May 5, 2026', balance: 7500 },
  { id: 'wt2', type: 'debit', amount: 3200, description: 'Order ORD-8021', date: 'May 3, 2026', balance: 2500 },
];

export interface LoyaltyHistory {
  id: string;
  type: 'earn' | 'spend';
  points: number;
  description: string;
  date: string;
}

export const mockLoyaltyHistory: LoyaltyHistory[] = [
  { id: 'lh1', type: 'earn', points: 350, description: 'Order ORD-7834', date: 'May 3, 2026' },
  { id: 'lh2', type: 'earn', points: 200, description: 'Referral bonus', date: 'Apr 28, 2026' },
];

export interface Dispute {
  id: string;
  orderId: string;
  issueType: string;
  status: 'submitted' | 'under_review' | 'resolved';
  submittedDate: string;
  description: string;
}

export const mockDisputes: Dispute[] = [
  { id: 'd1', orderId: 'ORD-7821', issueType: 'Missing Item', status: 'under_review', submittedDate: 'May 1, 2026', description: 'Missing fries from my order' },
];

export interface VendorMenuItem {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  maxOrders: number;
  currentOrders: number;
  category: string;
}

export const mockVendorMenuItems: VendorMenuItem[] = [
  { id: 'vm1', vendorId: 'v1', name: 'Ofe Onugbu + Fufu', description: 'Bitter leaf soup with assorted meat and fufu', price: 4500, maxOrders: 12, currentOrders: 8, category: 'Soups' },
];
