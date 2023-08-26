
  <h1><p align="center"><b><b>Plotline Ecommerse Based API Backend</b></b>
</p></h1>

<div align="center">

  <a href="">![Website shields.io](https://img.shields.io/website-up-down-green-red/http/shields.io.svg)</a>
  <a href="">![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)</a>
  <a href="">![Open In Collab](https://colab.research.google.com/assets/colab-badge.svg)</a>
  <a href="">[![made-with-python](https://img.shields.io/badge/Made%20with-Python-1f425f.svg)](https://www.python.org/)</a>
  <a href="">[![Minimum node.js version](https://badgen.net/npm/node/express)](https://npmjs.com/package/express)</a>
  <a href="">[![PyPI license](https://img.shields.io/pypi/l/ansicolortags.svg)](https://pypi.python.org/pypi/ansicolortags/)</a>
</div>

![Ecommerse Backend   API BASED ](https://github.com/Hjiwnain/PlotLine-Ecommerce/assets/80636235/38888a2b-817e-4f01-88c8-0cd18f16bef2)

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Starting the Application](#starting-the-application)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

To run this project, you'll need:

- A laptop or computer.
- [Node.js and NPM](https://nodejs.org/).
- A MySQL database.

## Installation & Setup

## 1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/ecommerce-cart-management.git
   cd ecommerce-cart-management
```

## 2. Install dependencies:
  ```
      npm install
  ```


## 3. Database Setup:
- Create a MySQL database and take note of your connection configurations.
- Rename .env.example to .env and fill in your database details:
```
      DB_HOST=your_host
      DB_USER=your_user
      DB_PASSWORD=your_password
      DB_DATABASE=your_database_name
      JWT_TOKEN_SECRET=your_secret_key
```
## 4. Database Migration:
- Use the provided SQL scripts to set up the required tables in your database.

## 5. Other configurations:
- Ensure to adjust other configurations in the .env or other config files as necessary, such as JWT secrets.

# Starting the Application

## 1. Start the app:
```
     node app.js
```

The application should now be running on 'http://localhost:3000'.

# API Endpoints

        '/AddToCart' - Add Item to users cart.
        '/Checkout' - Confirms the order and revert changes.
        '/getAllOrders' - Shows total transaction performed.
        '/forgotPassword' - Change Password For Existing User.

 [Additional API documentation if required]

# Contributing

- Wish to contribute? Feel free to open a pull request. For significant changes, kindly open an issue first to deliberate what you'd prefer to change.

# License

- This project is open-source and available under the MIT License.

    
- Just replace the placeholder text with the actual content. For example, replace `https://github.com/your-username/ecommerce-cart-management.git` with the actual 
  repository link.






