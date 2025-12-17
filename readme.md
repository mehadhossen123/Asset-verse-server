# AssetVerse – Backend API 🚀

Backend server for **AssetVerse**, a Corporate Asset Management System. This API handles authentication, asset management, employee operations, and secure payment processing.

---

## 🎯 Purpose

The purpose of this backend is to provide a **secure, scalable REST API** for the AssetVerse platform, enabling companies to manage assets, employees, and subscriptions efficiently.

---

## 🌐 Live API URL

👉 **Backend Live URL:**
[https://asset-verse-server-swart.vercel.app/](https://asset-verse-server-swart.vercel.app/)

---

## 🛠 Technologies & Dependencies

### Core Technologies

* Node.js
* Express.js
* MongoDB

### npm Packages Used

* express
* mongodb
* cors
* dotenv
* firebase-admin
* stripe
* nodemon (development)

---

## ✨ API Features

* 🔐 Authentication & Authorization (Firebase Admin)
* 🗂 Asset management (CRUD operations)
* 🧑‍💼 Employee management APIs
* 🔄 Asset assignment tracking
* 💳 Stripe payment & subscription handling
* 🔒 Secure environment variable configuration

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/assetverse-backend.git
cd assetverse-backend
```

---

### 2️⃣ Install Dependencies

```bash
npm install
```

---

### 3️⃣ Run the Server

#### Development Mode

```bash
nodemon index.js
```

#### Production Mode

```bash
node index.js
```

---

## 🔐 Environment Variables Configuration

Create a `.env` file in the root directory and add the following:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
STRIPE_SECRET_KEY=your_stripe_secret_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
```

⚠️ **Never commit your `.env` file to GitHub.**

---

## 📁 Project Structure (Example)

```
├── index.js
├── routes/
├── controllers/
├── middlewares/
├── utils/
└── .env
```

---

## 🚀 Future Improvements

* Role-based permission system
* API rate limiting
* Logging & monitoring
* Automated testing

---

## 👤 Author

**Rafi**
Backend Developer | MERN Stack Enthusiast

---

⭐ If you like this project, feel free to give it a star on GitHub!
