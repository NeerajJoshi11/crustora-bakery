 # 🍕 Crustora  
**A Full-Stack Food Ordering Platform with Real-World UX and Scalable Backend Integration**

🔗 Live Demo: https://crustora.netlify.app/

---

## 📌 Overview

Crustora is a production-oriented food ordering web application designed to simulate real-world product behavior.  
It focuses on secure authentication, persistent state management, and frictionless ordering workflows.

The platform enables users to browse items, manage carts, place orders, and seamlessly complete orders via external communication channels.

---

## 🚀 Core Features

### 🔐 Authentication & Session Management
- OTP-based authentication flow  
- Persistent sessions using backend-managed authentication  
- Secure logout with complete session invalidation  
- Automatic session revalidation on reload  

### 🛒 Cart Management
- Dynamic cart operations (add/remove/update items)  
- Persistent cart state across sessions  
- Optimized user flow with minimal friction  

### 📦 Order System
- User-specific order creation and storage  
- Order history tracking  
- Structured data handling via backend services  

### 💬 External Order Workflow
- Seamless redirection to WhatsApp / Instagram for order confirmation  
- Structured order message generation  
- Clipboard fallback for reliability  
- Real-time user feedback via toast notifications  

### 🎯 User Experience Enhancements
- Context-aware toast notifications (success, error, system feedback)  
- Well-defined empty states for better usability  
- Smooth and guided user flow from browsing to order placement  

---

## 🧠 Architecture & Tech Stack

### Frontend
- Next.js / React  
- TypeScript  
- Tailwind CSS  
- ShadCN UI (if applicable)  

### Backend & Database
- Supabase PostgreSQL (Menu Items, Categories, Users, Orders, PIN Auth)
- Vite Dev & API Middleware

### Ordering Flow
- Direct WhatsApp & Instagram Checkout with instantaneous Supabase order tracking

---

## ⚙️ Key Engineering Highlights

- Full category & menu CRUD management backed by Supabase PostgreSQL
- Instant WhatsApp deep-linking with structured order summary
- Zero-friction checkout without requiring customer sign-in barrier
- Protected Admin Portal via direct URL with PIN authorization
- Dual-layer data persistence: Cloud PostgreSQL + Client IndexedDB offline cache

---

## 🔄 Application Flow

1. Customer browses delicious bakery items & categories  
2. Adds desired treats to cart  
3. Clicks "Order via WhatsApp" or "Order via Instagram"  
4. System automatically records the order in Supabase PostgreSQL  
5. Seamlessly opens WhatsApp / Instagram with the formatted order text  

---

## 🏁 Getting Started

```bash
git clone https://github.com/your-username/crustora.git
cd crustora
npm install
npm run dev
```

---

## 🔐 Environment Configuration

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://postgres.your-project:your-password@aws-0-region.pooler.supabase.com:6543/postgres
```

---

## 📚 Key Learnings

- Cloud PostgreSQL schema design with automatic cascading category updates
- Real-time reactive storefront synchronization with administrative operations
- High-conversion frictionless social commerce for boutique bakeries  
- Handling edge cases and failure scenarios in production-like environments  

---

## 👨‍💻 Author

Neeraj Joshi

---

## ⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub!
