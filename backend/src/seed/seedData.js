require('dotenv').config();
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');

const restaurants = [
  {
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
    location: { city: 'Metro City', area: 'Downtown' },
    isOpen: true,
    offers: ['30% off up to $15', 'Free delivery on orders over $25'],
    menu: [
      { name: 'Butter Chicken', description: 'Tender chicken in rich tomato-butter gravy', price: 14.99, image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400', category: 'Main Course', isVeg: false, rating: 4.8 },
      { name: 'Paneer Tikka Masala', description: 'Grilled cottage cheese in spicy masala gravy', price: 12.99, image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400', category: 'Main Course', isVeg: true, rating: 4.6 },
      { name: 'Garlic Naan', description: 'Fresh baked bread with garlic butter', price: 3.99, image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400', category: 'Breads', isVeg: true, rating: 4.5 },
      { name: 'Biryani', description: 'Aromatic basmati rice with spices and meat', price: 15.99, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', category: 'Rice', isVeg: false, rating: 4.7 },
      { name: 'Veg Biryani', description: 'Fragrant rice with mixed vegetables and spices', price: 12.99, image: 'https://images.unsplash.com/photo-1642821373181-696a54913e93?w=400', category: 'Rice', isVeg: true, rating: 4.4 },
      { name: 'Tandoori Chicken', description: 'Whole chicken marinated and cooked in tandoor', price: 16.99, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c17206?w=400', category: 'Starters', isVeg: false, rating: 4.7 },
      { name: 'Samosa (2 pcs)', description: 'Crispy pastry filled with spiced potatoes', price: 4.99, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400', category: 'Starters', isVeg: true, rating: 4.3 },
      { name: 'Gulab Jamun', description: 'Sweet milk dumplings in rose syrup', price: 5.99, image: 'https://images.unsplash.com/photo-1666190077588-16a1fca8e0f4?w=400', category: 'Desserts', isVeg: true, rating: 4.6 },
    ],
    reviews: [
      { user: 'Sarah M.', rating: 5, comment: 'Best Indian food in the city! The butter chicken is amazing.', date: new Date('2026-04-15') },
      { user: 'John D.', rating: 4, comment: 'Great flavors, generous portions. Will order again.', date: new Date('2026-04-10') },
    ],
  },
  {
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
    location: { city: 'Metro City', area: 'Chinatown' },
    isOpen: true,
    offers: ['20% off on first order', 'Combo meals starting at $12'],
    menu: [
      { name: 'Kung Pao Chicken', description: 'Spicy stir-fried chicken with peanuts', price: 13.99, image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400', category: 'Main Course', isVeg: false, rating: 4.5 },
      { name: 'Vegetable Chow Mein', description: 'Stir-fried noodles with fresh vegetables', price: 10.99, image: 'https://images.unsplash.com/photo-1585032226651-759f2f306c4c?w=400', category: 'Noodles', isVeg: true, rating: 4.2 },
      { name: 'Dim Sum Platter', description: 'Assorted steamed dumplings (6 pcs)', price: 14.99, image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400', category: 'Starters', isVeg: false, rating: 4.7 },
      { name: 'Sweet Sour Pork', description: 'Crispy pork in tangy sweet sour sauce', price: 12.99, image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400', category: 'Main Course', isVeg: false, rating: 4.3 },
      { name: 'Fried Rice', description: 'Classic egg fried rice with vegetables', price: 9.99, image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400', category: 'Rice', isVeg: true, rating: 4.4 },
      { name: 'Spring Rolls (4 pcs)', description: 'Crispy vegetable spring rolls', price: 6.99, image: 'https://images.unsplash.com/photo-1548507267-9f0df406db3d?w=400', category: 'Starters', isVeg: true, rating: 4.1 },
      { name: 'Mapo Tofu', description: 'Silky tofu in spicy Sichuan sauce', price: 10.99, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', category: 'Main Course', isVeg: true, rating: 4.5 },
      { name: 'Mango Pudding', description: 'Smooth and creamy mango dessert', price: 4.99, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', category: 'Desserts', isVeg: true, rating: 4.2 },
    ],
    reviews: [
      { user: 'Mike R.', rating: 5, comment: 'Authentic Chinese flavors. The dim sum is incredible!', date: new Date('2026-04-12') },
      { user: 'Lisa T.', rating: 4, comment: 'Good food, fast delivery. Love the Kung Pao Chicken.', date: new Date('2026-04-08') },
    ],
  },
  {
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
    location: { city: 'Metro City', area: 'Little Italy' },
    isOpen: true,
    offers: ['Free garlic bread with pizza', 'Buy 1 Get 1 on selected pastas'],
    menu: [
      { name: 'Margherita Pizza', description: 'Classic pizza with tomato, mozzarella, basil', price: 14.99, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400', category: 'Pizza', isVeg: true, rating: 4.8 },
      { name: 'Pepperoni Pizza', description: 'Loaded with pepperoni and cheese', price: 16.99, image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400', category: 'Pizza', isVeg: false, rating: 4.7 },
      { name: 'Carbonara Pasta', description: 'Creamy pasta with bacon, egg, parmesan', price: 13.99, image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400', category: 'Pasta', isVeg: false, rating: 4.6 },
      { name: 'Penne Arrabiata', description: 'Penne in spicy tomato sauce', price: 11.99, image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400', category: 'Pasta', isVeg: true, rating: 4.4 },
      { name: 'Caesar Salad', description: 'Crispy romaine with Caesar dressing, croutons', price: 8.99, image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400', category: 'Salads', isVeg: true, rating: 4.3 },
      { name: 'Bruschetta', description: 'Toasted bread with tomato, garlic, basil', price: 7.99, image: 'https://images.unsplash.com/photo-1572695157366-5e58f90ff27d?w=400', category: 'Starters', isVeg: true, rating: 4.5 },
      { name: 'Tiramisu', description: 'Classic Italian coffee-flavored dessert', price: 7.99, image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400', category: 'Desserts', isVeg: true, rating: 4.9 },
      { name: 'Lasagna', description: 'Layers of pasta, meat sauce, and cheese', price: 14.99, image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400', category: 'Pasta', isVeg: false, rating: 4.7 },
    ],
    reviews: [
      { user: 'Emily W.', rating: 5, comment: 'The pizza is outstanding! Tastes just like Italy.', date: new Date('2026-04-18') },
      { user: 'David K.', rating: 4, comment: 'Great pasta dishes. The tiramisu is a must-try!', date: new Date('2026-04-14') },
    ],
  },
  {
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
    location: { city: 'Metro City', area: 'Midtown' },
    isOpen: true,
    offers: ['2 burgers for $15', 'Free fries with combo'],
    menu: [
      { name: 'Classic Cheeseburger', description: 'Angus beef patty with cheese, lettuce, tomato', price: 9.99, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', category: 'Burgers', isVeg: false, rating: 4.5 },
      { name: 'Bacon BBQ Burger', description: 'Smoky bacon, cheddar, BBQ sauce', price: 11.99, image: 'https://images.unsplash.com/photo-1553979459-d22034812371?w=400', category: 'Burgers', isVeg: false, rating: 4.6 },
      { name: 'Veggie Burger', description: 'Plant-based patty with avocado and sprouts', price: 10.99, image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400', category: 'Burgers', isVeg: true, rating: 4.2 },
      { name: 'Loaded Fries', description: 'Crispy fries with cheese, bacon, jalapenos', price: 7.99, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', category: 'Sides', isVeg: false, rating: 4.4 },
      { name: 'Onion Rings', description: 'Beer-battered crispy onion rings', price: 5.99, image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400', category: 'Sides', isVeg: true, rating: 4.3 },
      { name: 'Chocolate Milkshake', description: 'Thick and creamy chocolate shake', price: 5.99, image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400', category: 'Beverages', isVeg: true, rating: 4.7 },
      { name: 'Chicken Wings (8 pcs)', description: 'Crispy wings with your choice of sauce', price: 9.99, image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400', category: 'Starters', isVeg: false, rating: 4.5 },
      { name: 'Sundae', description: 'Vanilla ice cream with hot fudge and nuts', price: 4.99, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400', category: 'Desserts', isVeg: true, rating: 4.4 },
    ],
    reviews: [
      { user: 'Chris P.', rating: 5, comment: 'Best burgers in town! The Bacon BBQ is my favorite.', date: new Date('2026-04-20') },
      { user: 'Anna L.', rating: 4, comment: 'Great value for money. Milkshakes are awesome!', date: new Date('2026-04-16') },
    ],
  },
  {
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
    location: { city: 'Metro City', area: 'Eastside' },
    isOpen: true,
    offers: ['10% off on orders over $40', 'Free miso soup with sushi orders'],
    menu: [
      { name: 'Salmon Nigiri (2 pcs)', description: 'Fresh salmon over seasoned rice', price: 8.99, image: 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=400', category: 'Sushi', isVeg: false, rating: 4.8 },
      { name: 'California Roll (8 pcs)', description: 'Crab, avocado, cucumber, mayo', price: 10.99, image: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400', category: 'Sushi', isVeg: false, rating: 4.6 },
      { name: 'Tonkotsu Ramen', description: 'Rich pork bone broth with chashu and egg', price: 14.99, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f623?w=400', category: 'Ramen', isVeg: false, rating: 4.9 },
      { name: 'Veggie Ramen', description: 'Miso broth with vegetables and tofu', price: 12.99, image: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=400', category: 'Ramen', isVeg: true, rating: 4.4 },
      { name: 'Tempura Platter', description: 'Assorted shrimp and vegetable tempura', price: 13.99, image: 'https://images.unsplash.com/photo-1615361200141-f45040f667f3?w=400', category: 'Starters', isVeg: false, rating: 4.5 },
      { name: 'Edamame', description: 'Steamed soybeans with sea salt', price: 4.99, image: 'https://images.unsplash.com/photo-1564093497596-4e0647a1e247?w=400', category: 'Starters', isVeg: true, rating: 4.3 },
      { name: 'Matcha Ice Cream', description: 'Creamy Japanese green tea ice cream', price: 5.99, image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400', category: 'Desserts', isVeg: true, rating: 4.7 },
      { name: 'Mochi (3 pcs)', description: 'Soft rice cakes with sweet filling', price: 6.99, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400', category: 'Desserts', isVeg: true, rating: 4.5 },
    ],
    reviews: [
      { user: 'Yuki S.', rating: 5, comment: 'Most authentic Japanese food outside of Japan!', date: new Date('2026-04-22') },
      { user: 'Tom H.', rating: 5, comment: 'The ramen is perfection. Fresh fish every time.', date: new Date('2026-04-19') },
    ],
  },
  {
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
    location: { city: 'Metro City', area: 'Westside' },
    isOpen: true,
    offers: ['Taco Tuesday: $2 tacos', 'Free guacamole with burrito orders'],
    menu: [
      { name: 'Chicken Tacos (3 pcs)', description: 'Grilled chicken with salsa, onions, cilantro', price: 9.99, image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400', category: 'Tacos', isVeg: false, rating: 4.6 },
      { name: 'Veggie Burrito', description: 'Beans, rice, veggies, cheese, sour cream', price: 10.99, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400', category: 'Burritos', isVeg: true, rating: 4.4 },
      { name: 'Steak Quesadilla', description: 'Grilled steak with melted cheese and peppers', price: 12.99, image: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=400', category: 'Quesadillas', isVeg: false, rating: 4.5 },
      { name: 'Nachos Supreme', description: 'Tortilla chips with cheese, beans, jalapenos', price: 8.99, image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400', category: 'Starters', isVeg: true, rating: 4.3 },
      { name: 'Chicken Enchiladas', description: 'Corn tortillas with chicken, sauce, cheese', price: 11.99, image: 'https://images.unsplash.com/photo-1534352956036-cd81e27dd615?w=400', category: 'Main Course', isVeg: false, rating: 4.6 },
      { name: 'Churros', description: 'Fried dough with cinnamon sugar and chocolate', price: 5.99, image: 'https://images.unsplash.com/photo-1624371414361-e670246e0e1a?w=400', category: 'Desserts', isVeg: true, rating: 4.7 },
      { name: 'Horchata', description: 'Traditional rice drink with cinnamon', price: 3.99, image: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=400', category: 'Beverages', isVeg: true, rating: 4.5 },
      { name: 'Guacamole & Chips', description: 'Fresh avocado dip with tortilla chips', price: 6.99, image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e4?w=400', category: 'Starters', isVeg: true, rating: 4.6 },
    ],
    reviews: [
      { user: 'Maria G.', rating: 5, comment: 'Authentic Mexican flavors! Reminds me of home.', date: new Date('2026-04-21') },
      { user: 'Jake M.', rating: 4, comment: 'Great tacos and the nachos are loaded!', date: new Date('2026-04-17') },
    ],
  },
  {
    name: 'Green Bowl',
    description: 'Healthy and delicious bowls, salads, and smoothies. Fresh, organic ingredients for a balanced lifestyle.',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    cuisine: ['Healthy', 'Salads', 'Vegan'],
    rating: 4.5,
    reviewCount: 167,
    deliveryTime: '20-30 mins',
    priceForTwo: 450,
    priceRange: '$$',
    address: '222 Wellness Blvd, Uptown',
    location: { city: 'Metro City', area: 'Uptown' },
    isOpen: true,
    offers: ['15% off on smoothie bowls', 'Free protein add-on'],
    menu: [
      { name: 'Acai Bowl', description: 'Acai blend with granola, fruits, honey', price: 11.99, image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400', category: 'Bowls', isVeg: true, rating: 4.8 },
      { name: 'Quinoa Power Bowl', description: 'Quinoa, roasted veggies, avocado, tahini', price: 12.99, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', category: 'Bowls', isVeg: true, rating: 4.6 },
      { name: 'Chicken Caesar Salad', description: 'Grilled chicken, romaine, parmesan, croutons', price: 11.99, image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400', category: 'Salads', isVeg: false, rating: 4.4 },
      { name: 'Green Goddess Smoothie', description: 'Spinach, banana, mango, almond milk', price: 6.99, image: 'https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?w=400', category: 'Smoothies', isVeg: true, rating: 4.7 },
      { name: 'Berry Blast Smoothie', description: 'Mixed berries, yogurt, honey', price: 6.99, image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400', category: 'Smoothies', isVeg: true, rating: 4.5 },
      { name: 'Avocado Toast', description: 'Sourdough, smashed avocado, poached egg', price: 9.99, image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400', category: 'Toast', isVeg: true, rating: 4.6 },
      { name: 'Vegan Buddha Bowl', description: 'Chickpeas, sweet potato, kale, tahini', price: 12.99, image: 'https://images.unsplash.com/photo-1543339308-d59500569136?w=400', category: 'Bowls', isVeg: true, rating: 4.5 },
      { name: 'Energy Bites (4 pcs)', description: 'Date, nut, and coconut energy balls', price: 5.99, image: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f2e?w=400', category: 'Snacks', isVeg: true, rating: 4.3 },
    ],
    reviews: [
      { user: 'Emma S.', rating: 5, comment: 'Perfect for healthy eating! Fresh and delicious.', date: new Date('2026-04-23') },
      { user: 'Ryan B.', rating: 4, comment: 'Love the smoothie bowls. Great post-workout meal.', date: new Date('2026-04-20') },
    ],
  },
  {
    name: 'The Coffee House',
    description: 'Artisan coffee, freshly baked pastries, and light bites. Your neighborhood cafe for any time of day.',
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
    cuisine: ['Cafe', 'Coffee', 'Bakery'],
    rating: 4.3,
    reviewCount: 145,
    deliveryTime: '15-25 mins',
    priceForTwo: 300,
    priceRange: '$',
    address: '101 Brew Street, Arts District',
    location: { city: 'Metro City', area: 'Arts District' },
    isOpen: true,
    offers: ['Buy 2 coffees get 1 pastry free', 'Happy hour: 2-4 PM, 20% off'],
    menu: [
      { name: 'Cappuccino', description: 'Espresso with steamed milk foam', price: 4.49, image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400', category: 'Coffee', isVeg: true, rating: 4.6 },
      { name: 'Iced Latte', description: 'Espresso, cold milk, served over ice', price: 4.99, image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400', category: 'Coffee', isVeg: true, rating: 4.5 },
      { name: 'Croissant', description: 'Buttery, flaky French pastry', price: 3.49, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400', category: 'Pastries', isVeg: true, rating: 4.7 },
      { name: 'Avocado Sandwich', description: 'Smashed avocado, tomato, on sourdough', price: 8.99, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400', category: 'Sandwiches', isVeg: true, rating: 4.4 },
      { name: 'Blueberry Muffin', description: 'Freshly baked with real blueberries', price: 3.99, image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400', category: 'Pastries', isVeg: true, rating: 4.5 },
      { name: 'Chocolate Cake', description: 'Rich chocolate layer cake', price: 5.99, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', category: 'Desserts', isVeg: true, rating: 4.8 },
      { name: 'Bagel & Cream Cheese', description: 'Toasted bagel with cream cheese', price: 4.49, image: 'https://images.unsplash.com/photo-1585476637579-99fb188a30f5?w=400', category: 'Breakfast', isVeg: true, rating: 4.3 },
      { name: 'Matcha Latte', description: 'Japanese green tea with steamed milk', price: 5.49, image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400', category: 'Tea', isVeg: true, rating: 4.6 },
    ],
    reviews: [
      { user: 'Sophie R.', rating: 5, comment: 'Best cappuccino in the area! Love the cozy vibe.', date: new Date('2026-04-24') },
      { user: 'Alex N.', rating: 4, comment: 'Great pastries and excellent coffee. My daily spot.', date: new Date('2026-04-21') },
    ],
  },
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery');
    console.log('Connected to MongoDB');

    await Restaurant.deleteMany({});
    console.log('Cleared existing restaurants');

    const createdRestaurants = await Restaurant.insertMany(restaurants);
    console.log(`Seeded ${createdRestaurants.length} restaurants`);

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedDatabase();
