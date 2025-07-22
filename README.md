# Venture Creations

**Live Site:** [https://venturecreations.net](https://venturecreations.net)  
**Repository:** [github.com/CJLynch01/venturecreations](https://github.com/CJLynch01/venturecreations)

Venture Creations is a full-featured e-commerce website for custom t-shirts and merchandise. Built with Node.js, Express, MongoDB, and EJS, it offers both admin and customer interfaces, product management, Stripe integration, Google OAuth, and a live blog system.

---

## 🚀 Features

### 🛍️ Customer
- Browse products in a responsive shop layout
- Add items to cart and checkout securely via Stripe
- Register/Login using Google
- View and download documents from admin
- Read blog posts and announcements
- Contact form to reach the business

### 🧑‍💼 Admin
- Login with Google (restricted by verified email)
- Create, edit, and delete products
- Manage customer-uploaded documents
- Upload blog posts using Markdown
- View customer dashboard submissions

---

## 🧱 Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **Frontend:** EJS Templates + CSS
- **Authentication:** Google OAuth 2.0 with Passport.js
- **Payments:** Stripe Checkout API
- **File Uploads:** AWS S3 (for product images and documents)
- **Deployment:** Render (backend) + Custom Domain via Hostinger