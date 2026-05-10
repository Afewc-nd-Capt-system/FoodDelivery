export interface Restaurant {
  id: string;
  name: string;
  image: string;
  coverImage: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  priceRange: string;
  categories: string[];
  distance: string;
  promoted?: boolean;
  discount?: string;
  cuisine: string;
  address: string;
  isOpen: boolean;
  minOrder: number;
  deliveryFee: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  popular?: boolean;
  calories?: string;
  customizations?: { name: string; options: { label: string; price: number }[] }[];
}

export interface Vendor {
  id: string;
  name: string;
  image: string;
  coverImage: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  priceRange: string;
  categories: string[];
  distance: string;
  promoted?: boolean;
  discount?: string;
  cuisine: string;
  address: string;
  isOpen: boolean;
  minOrder: number;
  deliveryFee: number;
  cookingDays: string[];
}

export interface Review {
  id: string;
  restaurantId: string;
  userName: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
}

export const restaurants: Restaurant[] = [
  {
    id: '1',
    name: 'Mama Cass Kitchen',
    image: 'https://images.unsplash.com/photo-1664992960082-0ea299a9c53e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    coverImage: 'https://images.unsplash.com/photo-1664992960082-0ea299a9c53e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    rating: 4.8,
    reviewCount: 1243,
    deliveryTime: '20-35 min',
    priceRange: '₦₦',
    categories: ['Rice', 'Soups', 'Swallow'],
    distance: '1.2 km',
    promoted: true,
    discount: '20% OFF',
    cuisine: 'Traditional Nigerian',
    address: '14 Allen Avenue, Ikeja, Lagos',
    isOpen: true,
    minOrder: 2000,
    deliveryFee: 500,
  },
  {
    id: '2',
    name: 'Chop Chop Lagos',
    image: 'https://images.unsplash.com/photo-1665332195309-9d75071138f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    coverImage: 'https://images.unsplash.com/photo-1665332195309-9d75071138f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    rating: 4.5,
    reviewCount: 876,
    deliveryTime: '15-25 min',
    priceRange: '₦₦₦',
    categories: ['Fast Food', 'Grills', 'Shawarma'],
    distance: '0.8 km',
    cuisine: 'Fast Food',
    address: '5B Victoria Island, Lagos',
    isOpen: true,
    minOrder: 1500,
    deliveryFee: 300,
  },
  {
    id: '3',
    name: 'The Pepper Spot',
    image: 'https://images.unsplash.com/photo-1664993101841-036f189719b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    coverImage: 'https://images.unsplash.com/photo-1664993101841-036f189719b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    rating: 4.7,
    reviewCount: 654,
    deliveryTime: '25-40 min',
    priceRange: '₦₦',
    categories: ['Grills', 'Suya', 'Pepper Soup'],
    distance: '2.1 km',
    promoted: true,
    cuisine: 'Nigerian Grills',
    address: '22 Oba Akran, Ikeja, Lagos',
    isOpen: true,
    minOrder: 2500,
    deliveryFee: 600,
  },
  {
    id: '4',
    name: 'Jollof Republic',
    image: 'https://images.unsplash.com/photo-1665333048952-a3ee97714c6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    coverImage: 'https://images.unsplash.com/photo-1665333048952-a3ee97714c6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    rating: 4.9,
    reviewCount: 2100,
    deliveryTime: '20-30 min',
    priceRange: '₦₦₦₦',
    categories: ['Rice', 'Sides', 'Premium'],
    distance: '1.5 km',
    discount: '15% OFF',
    cuisine: 'Premium Nigerian',
    address: '3 Admiralty Way, Lekki, Lagos',
    isOpen: true,
    minOrder: 3000,
    deliveryFee: 400,
  },
  {
    id: '5',
    name: 'Naija Bites Express',
    image: 'https://images.unsplash.com/photo-1665556899022-9761f95769e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    coverImage: 'https://images.unsplash.com/photo-1665556899022-9761f95769e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    rating: 4.3,
    reviewCount: 432,
    deliveryTime: '15-20 min',
    priceRange: '₦',
    categories: ['Fast Food', 'Snacks', 'Budget'],
    distance: '0.5 km',
    cuisine: 'Nigerian Fast Food',
    address: '7 Awolowo Road, Ikoyi, Lagos',
    isOpen: true,
    minOrder: 1000,
    deliveryFee: 200,
  },
  {
    id: '6',
    name: 'Lagos Grill House',
    image: 'https://images.unsplash.com/photo-1643995529703-03178ae2584f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    coverImage: 'https://images.unsplash.com/photo-1643995529703-03178ae2584f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    rating: 4.6,
    reviewCount: 789,
    deliveryTime: '30-45 min',
    priceRange: '₦₦₦₦',
    categories: ['Premium', 'Grills', 'Steak'],
    distance: '3.2 km',
    cuisine: 'Premium Grills',
    address: '15 Oniru, Victoria Island, Lagos',
    isOpen: false,
    minOrder: 5000,
    deliveryFee: 800,
  },
  {
    id: '7',
    name: 'Chef Chi\'s Fusion',
    image: 'https://images.unsplash.com/photo-1670063648721-768ca3e57342?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    coverImage: 'https://images.unsplash.com/photo-1670063648721-768ca3e57342?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    rating: 4.4,
    reviewCount: 321,
    deliveryTime: '25-35 min',
    priceRange: '₦₦₦',
    categories: ['Fusion', 'Rice', 'Grills'],
    distance: '1.8 km',
    cuisine: 'Afro-Fusion',
    address: '9 Bode Thomas, Surulere, Lagos',
    isOpen: true,
    minOrder: 2500,
    deliveryFee: 450,
  },
  {
    id: '8',
    name: 'Suya Shack',
    image: 'https://images.unsplash.com/photo-1777634659945-fae3d53ea1dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    coverImage: 'https://images.unsplash.com/photo-1777634659945-fae3d53ea1dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    rating: 4.7,
    reviewCount: 567,
    deliveryTime: '20-30 min',
    priceRange: '₦₦',
    categories: ['Suya', 'Grills', 'Snacks'],
    distance: '1.0 km',
    discount: '10% OFF',
    cuisine: 'Nigerian Grills',
    address: '3 Broad Street, Lagos Island',
    isOpen: true,
    minOrder: 1500,
    deliveryFee: 350,
  },
];

export const menuItems: MenuItem[] = [
  {
    id: 'm1',
    restaurantId: '1',
    name: 'Jollof Rice & Chicken',
    description: 'Smoky party jollof rice served with fried or grilled chicken and fried plantain',
    price: 3500,
    image: 'https://images.unsplash.com/photo-1664992960082-0ea299a9c53e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    category: 'Rice',
    popular: true,
    calories: '650 cal',
    customizations: [
      {
        name: 'Protein',
        options: [
          { label: 'Fried Chicken', price: 0 },
          { label: 'Grilled Chicken', price: 200 },
          { label: 'Beef', price: 300 },
          { label: 'Turkey', price: 400 },
          { label: 'Fish', price: 250 },
        ],
      },
      {
        name: 'Extras',
        options: [
          { label: 'Extra Plantain', price: 200 },
          { label: 'Coleslaw', price: 150 },
          { label: 'Extra Sauce', price: 100 },
        ],
      },
    ],
  },
  {
    id: 'm2',
    restaurantId: '1',
    name: 'Fried Rice & Turkey',
    description: 'Nigerian fried rice with mixed vegetables, grilled turkey and fried plantain',
    price: 4000,
    image: 'https://images.unsplash.com/photo-1665332195309-9d75071138f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    category: 'Rice',
    popular: true,
    calories: '720 cal',
  },
  {
    id: 'm3',
    restaurantId: '1',
    name: 'Egusi Soup + Swallow',
    description: 'Rich egusi soup with assorted meat, cooked with fresh tomatoes and palm oil',
    price: 3000,
    image: 'https://images.unsplash.com/photo-1664993101841-036f189719b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    category: 'Swallow',
    calories: '580 cal',
    customizations: [
      {
        name: 'Swallow Choice',
        options: [
          { label: 'Eba (Garri)', price: 0 },
          { label: 'Fufu', price: 0 },
          { label: 'Semolina', price: 0 },
          { label: 'Amala', price: 100 },
          { label: 'Pounded Yam', price: 200 },
        ],
      },
    ],
  },
  {
    id: 'm4',
    restaurantId: '1',
    name: 'Catfish Pepper Soup',
    description: 'Spicy catfish pepper soup with special herbs and aromatic spices',
    price: 4500,
    image: 'https://images.unsplash.com/photo-1665333048952-a3ee97714c6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    category: 'Soups',
    calories: '320 cal',
    customizations: [
      {
        name: 'Meat Type',
        options: [
          { label: 'Catfish', price: 0 },
          { label: 'Goat Meat', price: 500 },
          { label: 'Chicken', price: 200 },
          { label: 'Assorted', price: 700 },
        ],
      },
    ],
  },
  {
    id: 'm5',
    restaurantId: '1',
    name: 'Puff Puff (10 pcs)',
    description: 'Freshly fried Nigerian doughnuts, crispy outside, fluffy inside',
    price: 800,
    image: 'https://images.unsplash.com/photo-1665556899022-9761f95769e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    category: 'Snacks',
    calories: '240 cal',
  },
  {
    id: 'm6',
    restaurantId: '1',
    name: 'Moin Moin Special',
    description: 'Steamed bean pudding with boiled eggs and fish fillets',
    price: 1200,
    image: 'https://images.unsplash.com/photo-1664992960082-0ea299a9c53e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    category: 'Snacks',
    calories: '280 cal',
  },
  {
    id: 'm7',
    restaurantId: '1',
    name: 'Chapman Cocktail',
    description: 'Refreshing Nigerian cocktail with Ribena, Fanta, Sprite and fresh fruits',
    price: 1500,
    image: 'https://images.unsplash.com/photo-1665332195309-9d75071138f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    category: 'Drinks',
    calories: '180 cal',
  },
  {
    id: 'm8',
    restaurantId: '1',
    name: 'Banga Soup + Starch',
    description: 'Authentic Delta-style palm nut soup with assorted meats and starch',
    price: 3800,
    image: 'https://images.unsplash.com/photo-1664993101841-036f189719b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    category: 'Swallow',
    popular: true,
    calories: '490 cal',
  },
];

export const reviews: Review[] = [
  {
    id: 'r1',
    restaurantId: '1',
    userName: 'Chioma A.',
    avatar: 'CA',
    rating: 5,
    comment: 'Best jollof rice in Lagos! The smoky flavor is unmatched. Delivery was fast and food was still hot. 10/10!',
    date: '2 days ago',
    helpful: 24,
  },
  {
    id: 'r2',
    restaurantId: '1',
    userName: 'Emeka O.',
    avatar: 'EO',
    rating: 5,
    comment: 'Mama Cass never disappoints. The egusi soup was rich and flavorful. Eba was perfectly made. Keep it up!',
    date: '1 week ago',
    helpful: 18,
  },
  {
    id: 'r3',
    restaurantId: '1',
    userName: 'Ngozi B.',
    avatar: 'NB',
    rating: 4,
    comment: 'Good food, quick delivery. Portion size could be a bit bigger for the price but overall very satisfied.',
    date: '2 weeks ago',
    helpful: 7,
  },
  {
    id: 'r4',
    restaurantId: '1',
    userName: 'Tunde F.',
    avatar: 'TF',
    rating: 5,
    comment: 'Always my go-to spot for authentic Nigerian food. The banga soup is absolutely divine!',
    date: '3 weeks ago',
    helpful: 31,
  },
];

export const orderHistory = [
  {
    id: 'ORD-7834',
    restaurant: 'Mama Cass Kitchen',
    items: ['Jollof Rice & Chicken', 'Puff Puff x2'],
    total: 5300,
    status: 'delivered',
    date: 'May 3, 2026',
    image: 'https://images.unsplash.com/photo-1664992960082-0ea299a9c53e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  },
  {
    id: 'ORD-7821',
    restaurant: 'Chop Chop Lagos',
    items: ['Chicken Shawarma', 'Fries', 'Pepsi'],
    total: 7200,
    status: 'delivered',
    date: 'Apr 28, 2026',
    image: 'https://images.unsplash.com/photo-1665332195309-9d75071138f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  },
  {
    id: 'ORD-7799',
    restaurant: 'The Pepper Spot',
    items: ['Suya Platter', 'Chapman Cocktail'],
    total: 9500,
    status: 'delivered',
    date: 'Apr 20, 2026',
    image: 'https://images.unsplash.com/photo-1664993101841-036f189719b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  },
  {
    id: 'ORD-7756',
    restaurant: 'Jollof Republic',
    items: ['Premium Jollof Platter', 'Zobo Drink'],
    total: 12000,
    status: 'delivered',
    date: 'Apr 12, 2026',
    image: 'https://images.unsplash.com/photo-1665333048952-a3ee97714c6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  },
];

export const adminStats = {
  totalOrders: 12483,
  totalRevenue: 28750000,
  activeRestaurants: 284,
  totalUsers: 45892,
  ordersToday: 347,
  revenueToday: 1230000,
  pendingOrders: 23,
  deliveryPartners: 128,
};

export const adminOrders = [
  { id: 'ORD-8001', customer: 'Tunde Adebayo', restaurant: 'Mama Cass', items: 3, total: 8500, status: 'preparing', time: '2 min ago' },
  { id: 'ORD-8002', customer: 'Amara Osei', restaurant: 'Chop Chop', items: 2, total: 5200, status: 'on_the_way', time: '8 min ago' },
  { id: 'ORD-8003', customer: 'Kemi Fadele', restaurant: 'Jollof Republic', items: 4, total: 15000, status: 'delivered', time: '15 min ago' },
  { id: 'ORD-8004', customer: 'Dapo Williams', restaurant: 'Pepper Spot', items: 1, total: 4500, status: 'confirmed', time: '22 min ago' },
  { id: 'ORD-8005', customer: 'Zara Ibrahim', restaurant: 'Naija Bites', items: 2, total: 3200, status: 'preparing', time: '30 min ago' },
  { id: 'ORD-8006', customer: 'Bola Akin', restaurant: 'Suya Shack', items: 3, total: 6800, status: 'confirmed', time: '35 min ago' },
];

export const chartData = [
  { name: 'Mon', orders: 120, revenue: 540 },
  { name: 'Tue', orders: 145, revenue: 650 },
  { name: 'Wed', orders: 98, revenue: 441 },
  { name: 'Thu', orders: 187, revenue: 841 },
  { name: 'Fri', orders: 234, revenue: 1053 },
  { name: 'Sat', orders: 312, revenue: 1404 },
  { name: 'Sun', orders: 278, revenue: 1251 },
];

export const vendors: Vendor[] = [
  {
    id: 'v1',
    name: 'Auntie Joke\'s Kitchen',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    coverImage: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    rating: 4.7,
    reviewCount: 234,
    deliveryTime: '35-45 min',
    priceRange: '$$$',
    categories: ['Nigerian', 'Swallow', 'Soups'],
    distance: '2.5 km',
    promoted: true,
    discount: '15% OFF',
    cuisine: 'Nigerian',
    address: 'Ikoyi, Lagos',
    isOpen: true,
    minOrder: 3000,
    deliveryFee: 500,
    cookingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  },
  {
    id: 'v2',
    name: 'Mama Nkechi\'s Delights',
    image: 'https://images.unsplash.com/photo-1555939594-58d6cb864120?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    coverImage: 'https://images.unsplash.com/photo-1555939594-58d6cb864120?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    rating: 4.9,
    reviewCount: 189,
    deliveryTime: '40-50 min',
    priceRange: '$$',
    categories: ['Continental', 'Pastries', 'Cakes'],
    distance: '3.1 km',
    promoted: false,
    cuisine: 'Continental',
    address: 'Victoria Island, Lagos',
    isOpen: true,
    minOrder: 2500,
    deliveryFee: 0,
    cookingDays: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },
  {
    id: 'v3',
    name: 'Chef Segun\'s Special',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    coverImage: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    rating: 4.6,
    reviewCount: 156,
    deliveryTime: '30-40 min',
    priceRange: '$$$',
    categories: ['Grills', 'BBQ', 'Suya'],
    distance: '1.8 km',
    promoted: false,
    cuisine: 'Grills & BBQ',
    address: 'Surulere, Lagos',
    isOpen: true,
    minOrder: 4000,
    deliveryFee: 300,
    cookingDays: ['Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  {
    id: 'v4',
    name: 'Sisi Bisi Catering',
    image: 'https://images.unsplash.com/photo-1504639725590-78a6433a4af9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    coverImage: 'https://images.unsplash.com/photo-1504639725590-78a6433a4af9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    rating: 4.8,
    reviewCount: 298,
    deliveryTime: '45-55 min',
    priceRange: '$$',
    categories: ['Catering', 'Events', 'Party'],
    distance: '4.2 km',
    discount: '10% OFF',
    cuisine: 'Catering',
    address: 'Lekki Phase 1, Lagos',
    isOpen: false,
    minOrder: 10000,
    deliveryFee: 0,
    cookingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  },
];

export const topRestaurants = [
  { name: 'Mama Cass Kitchen', orders: 1243, revenue: 4350000, rating: 4.8 },
  { name: 'Jollof Republic', orders: 987, revenue: 9870000, rating: 4.9 },
  { name: 'Chop Chop Lagos', orders: 876, revenue: 3504000, rating: 4.5 },
  { name: 'The Pepper Spot', orders: 654, revenue: 2943000, rating: 4.7 },
  { name: 'Suya Shack', orders: 567, revenue: 1701000, rating: 4.7 },
];

export const deliveryOrders = [
  {
    id: 'DEL-4521',
    customer: 'Funmi Adeyemi',
    restaurant: 'Mama Cass Kitchen',
    address: '12 Glover Road, Ikoyi, Lagos',
    items: 3,
    amount: 8500,
    distance: '3.2 km',
    estimatedTime: '12 min',
    status: 'pickup',
  },
];
