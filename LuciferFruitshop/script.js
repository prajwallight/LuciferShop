// PRODUCT DATA
let products = JSON.parse(localStorage.getItem('products')) || [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let orders = JSON.parse(localStorage.getItem('orders')) || [];
let messages = JSON.parse(localStorage.getItem('messages')) || [];

// Global variables for chat
let currentChatOrder = null;
let currentCustomer = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    displayProducts();
    displayAdmin();
    updateCartCount();
    initializeDragDrop();
    updateAdminStats();
});

// DRAG & DROP FUNCTIONALITY
function initializeDragDrop() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('pImageFile');
    const preview = document.getElementById('imagePreview');
    
    if (!dropZone) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);
    
    // Handle file input change
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect, false);
    }
    
    // Click on drop zone triggers file input
    dropZone.addEventListener('click', () => {
        if (fileInput) fileInput.click();
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    const dropZone = document.getElementById('dropZone');
    if (dropZone) dropZone.classList.add('dragover');
}

function unhighlight() {
    const dropZone = document.getElementById('dropZone');
    if (dropZone) dropZone.classList.remove('dragover');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            // Check file size (2MB limit)
            if (file.size > 2 * 1024 * 1024) {
                alert('Image too large! Please use images under 2MB.');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                // Convert image to base64 for storage
                const imageUrl = e.target.result;
                document.getElementById('pImage').value = imageUrl;
                document.getElementById('imagePreview').src = imageUrl;
                document.getElementById('imagePreview').style.display = 'block';
                document.querySelector('#dropZone p').textContent = 'Image selected! Click to change.';
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please select an image file (JPEG, PNG, GIF, etc.).');
        }
    }
}

// STOCK MANAGEMENT FUNCTIONS
function updateProductStock(productIndex, newStock) {
    products[productIndex].quantity = Math.max(0, parseInt(newStock) || 0).toString();
    saveToStorage('products', products);
    displayAdmin();
    displayProducts();
    updateAdminStats();
}

function getStockStatus(stock) {
    const quantity = parseInt(stock) || 0;
    if (quantity === 0) return { status: 'out', class: 'stock-out', text: 'Out of Stock' };
    if (quantity <= 5) return { status: 'low', class: 'stock-low', text: `Low Stock: ${quantity}` };
    return { status: 'good', class: 'stock-good', text: `In Stock: ${quantity}` };
}

// DISPLAY PRODUCTS IN SHOP
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (products.length === 0) {
        container.innerHTML = '<p>No products available. Add some products in admin panel.</p>';
        return;
    }
    
    products.forEach((product, index) => {
        const productDiv = document.createElement('div');
        productDiv.className = 'product';
        
        const stockInfo = getStockStatus(product.quantity);
        const currentStock = parseInt(product.quantity) || 0;
        
        const buttonHtml = currentStock > 0 ? 
            `<button onclick="addToCart(${index})">Add to Cart</button>` :
            `<button disabled style="background: #ccc; cursor: not-allowed;">Out of Stock</button>`;
        
        productDiv.innerHTML = `
            <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/260x180/8a2be2/ffffff?text=No+Image'">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <p><strong>Price:</strong> $${product.price}</p>
            <p class="${stockInfo.class}"><strong>${stockInfo.text}</strong></p>
            ${buttonHtml}
        `;
        container.appendChild(productDiv);
    });
}

// CART FUNCTIONS WITH STOCK MANAGEMENT
function addToCart(productIndex) {
    const product = products[productIndex];
    
    // Check if product is in stock
    const currentStock = parseInt(product.quantity) || 0;
    if (currentStock <= 0) {
        alert('Sorry, this product is out of stock!');
        return;
    }
    
    const existingItem = cart.find(item => item.name === product.name);
    
    if (existingItem) {
        // Check if adding more than available stock
        const totalRequested = existingItem.quantity + 1;
        if (totalRequested > currentStock) {
            alert(`Sorry, only ${currentStock} items available in stock!`);
            return;
        }
        existingItem.quantity += 1;
    } else {
        cart.push({
            name: product.name,
            price: product.price,
            quantity: 1,
            image: product.image
        });
    }
    
    saveToStorage('cart', cart);
    updateCartCount();
    alert('Product added to cart!');
}

function updateCartCount() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
}

function openCart() {
    const modal = document.getElementById('cartModal');
    if (!modal) return;
    
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p>Your cart is empty</p>';
        cartTotal.textContent = '0';
    } else {
        let total = 0;
        let hasStockIssues = false;
        let stockIssues = [];
        
        cart.forEach((item, index) => {
            const itemTotal = parseFloat(item.price) * item.quantity;
            total += itemTotal;
            
            // Check stock for this item
            const product = products.find(p => p.name === item.name);
            const currentStock = product ? parseInt(product.quantity) || 0 : 0;
            const stockWarning = currentStock < item.quantity ? 
                `<div style="color: red; font-size: 0.8rem; margin-top: 5px;">
                    ⚠️ Only ${currentStock} available in stock
                </div>` : '';
            
            if (currentStock < item.quantity) {
                hasStockIssues = true;
                stockIssues.push(`${item.name} - Only ${currentStock} available, but ${item.quantity} in cart`);
            }
            
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div>
                    <strong>${item.name}</strong><br>
                    $${item.price} x ${item.quantity}
                    ${stockWarning}
                </div>
                <div>$${itemTotal.toFixed(2)}</div>
            `;
            cartItems.appendChild(cartItem);
        });
        
        cartTotal.textContent = total.toFixed(2);
        
        // Show warning if there are stock issues
        if (hasStockIssues) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'stock-warning';
            warningDiv.innerHTML = `
                ⚠️ <strong>Stock Issues Detected:</strong><br>
                ${stockIssues.join('<br>')}<br><br>
                Please update your cart quantities before checkout.
            `;
            cartItems.appendChild(warningDiv);
        }
    }
    
    modal.style.display = 'flex';
}

function closeCart() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function checkout() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    
    // Check stock availability before showing checkout
    let stockIssues = [];
    
    cart.forEach(cartItem => {
        const product = products.find(p => p.name === cartItem.name);
        if (product) {
            const currentStock = parseInt(product.quantity) || 0;
            if (currentStock < cartItem.quantity) {
                stockIssues.push(`${product.name} - Only ${currentStock} available, but ${cartItem.quantity} in cart`);
            }
        }
    });
    
    if (stockIssues.length > 0) {
        alert('Stock issues detected:\n' + stockIssues.join('\n') + '\n\nPlease update your cart before proceeding.');
        return;
    }
    
    closeCart();
    
    const checkoutModal = document.getElementById('checkoutModal');
    const checkoutTotal = document.getElementById('checkoutTotal');
    
    if (checkoutModal && checkoutTotal) {
        const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
        checkoutTotal.textContent = total.toFixed(2);
        
        // Prepare data for Netlify form
        const orderDetails = JSON.stringify(cart);
        document.getElementById('orderDetails').value = orderDetails;
        document.getElementById('orderTotal').value = total.toFixed(2);
        
        checkoutModal.style.display = 'flex';
    }
}

function closeCheckout() {
    const modal = document.getElementById('checkoutModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ORDER TRACKING WITH NETLIFY FALLBACK
async function trackOrder() {
    const email = document.getElementById('orderEmail').value;
    if (!email) {
        alert('Please enter your email');
        return;
    }
    
    const orderDetails = document.getElementById('orderDetails');
    orderDetails.innerHTML = '<p>Searching for orders...</p>';
    
    try {
        // Try Netlify function first
        const response = await fetch('/.netlify/functions/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email: email,
                action: 'track'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.orders && data.orders.length > 0) {
                displayOrders(data.orders);
            } else {
                // Fallback to localStorage
                fallbackOrderTracking(email);
            }
        } else {
            fallbackOrderTracking(email);
        }
    } catch (error) {
        console.error('Netlify function error:', error);
        fallbackOrderTracking(email);
    }
}

function fallbackOrderTracking(email) {
    const customerOrders = orders.filter(order => 
        order.customerEmail.toLowerCase() === email.toLowerCase()
    );
    
    const orderDetails = document.getElementById('orderDetails');
    orderDetails.innerHTML = '';
    
    if (customerOrders.length === 0) {
        orderDetails.innerHTML = '<p>No orders found for this email.</p>';
        return;
    }
    
    displayOrders(customerOrders);
}

function displayOrders(orderList) {
    const orderDetails = document.getElementById('orderDetails');
    orderDetails.innerHTML = '';
    
    orderList.forEach(order => {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-details';
        orderDiv.innerHTML = `
            <h4>Order #${order.id}</h4>
            <p><strong>Status:</strong> <span class="order-status status-${order.status}">${order.status.toUpperCase()}</span></p>
            <p><strong>Date:</strong> ${order.date}</p>
            <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
            <div>
                <strong>Products:</strong>
                ${order.products.map(product => `
                    <div class="order-product">
                        <span>${product.name} x${product.quantity}</span>
                        <span>$${(parseFloat(product.price) * product.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
        `;
        orderDetails.appendChild(orderDiv);
    });
}

// CONTACT SUPPORT
function openContactForm() {
    const modal = document.getElementById('contactModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeContact() {
    const modal = document.getElementById('contactModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ORDER TRACKING MODAL
function openOrderTracking() {
    const modal = document.getElementById('orderTrackingModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('orderEmail').value = '';
        document.getElementById('orderDetails').innerHTML = '';
    }
}

function closeOrderTracking() {
    const modal = document.getElementById('orderTrackingModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// UTILITY FUNCTIONS
function showComingSoon() {
    alert('This feature is coming soon! Stay tuned.');
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Storage error:', e);
        alert('Storage limit exceeded. Please clear some data or reduce image sizes.');
    }
}

// ADMIN PANEL FUNCTIONS
function displayAdmin() {
    const adminDiv = document.getElementById('adminProducts');
    if(!adminDiv) return;
    
    adminDiv.innerHTML = '';
    
    if(products.length === 0) {
        adminDiv.innerHTML = '<p>No products added yet.</p>';
    } else {
        products.forEach((p, i) => {
            const stockInfo = getStockStatus(p.quantity);
            const div = document.createElement('div');
            div.innerHTML = `
                <span>
                    <strong>${p.name}</strong> | 
                    Price: $${p.price} | 
                    Stock: <input type="number" value="${p.quantity}" style="width: 60px; padding: 2px;" onchange="updateProductStock(${i}, this.value)" min="0">
                    <span class="${stockInfo.class}" style="margin-left: 10px;">${stockInfo.text}</span>
                </span>
                <div>
                    <button onclick="editProduct(${i})">Edit</button>
                    <button onclick="deleteProduct(${i})">Delete</button>
                </div>
            `;
            adminDiv.appendChild(div);
        });
    }
    
    displayOrdersAdmin();
    displayMessages();
    updateAdminStats();
}

function updateAdminStats() {
    const totalProducts = document.getElementById('totalProducts');
    const totalOrders = document.getElementById('totalOrders');
    const lowStockCount = document.getElementById('lowStockCount');
    
    if (totalProducts) totalProducts.textContent = products.length;
    if (totalOrders) totalOrders.textContent = orders.length;
    if (lowStockCount) {
        const lowStock = products.filter(p => {
            const stock = parseInt(p.quantity) || 0;
            return stock > 0 && stock <= 5;
        }).length;
        lowStockCount.textContent = lowStock;
    }
}

function displayOrdersAdmin() {
    const ordersContainer = document.getElementById('ordersContainer');
    if (!ordersContainer) return;
    
    ordersContainer.innerHTML = '';
    
    if (orders.length === 0) {
        ordersContainer.innerHTML = '<p>No orders yet.</p>';
        return;
    }
    
    orders.forEach((order, index) => {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-item';
        orderDiv.innerHTML = `
            <h4>Order #${order.id}</h4>
            <p><strong>Customer:</strong> ${order.customerName}</p>
            <p><strong>Email:</strong> ${order.customerEmail}</p>
            <p><strong>Game ID:</strong> ${order.customerGameID}</p>
            <p><strong>Date:</strong> ${order.date}</p>
            <div>
                <strong>Products:</strong>
                ${order.products.map(product => `
                    <div class="order-product">
                        <span>${product.name} x${product.quantity}</span>
                        <span>$${(parseFloat(product.price) * product.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            <p><strong>Total: $${order.total.toFixed(2)}</strong></p>
            <div>
                <span class="order-status status-${order.status}">${order.status.toUpperCase()}</span>
                <button onclick="updateOrderStatus(${index}, 'completed')">Complete</button>
                <button onclick="updateOrderStatus(${index}, 'cancelled')">Cancel</button>
            </div>
        `;
        ordersContainer.appendChild(orderDiv);
    });
}

function displayMessages() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '';
    
    if (messages.length === 0) {
        messagesContainer.innerHTML = '<p>No messages yet.</p>';
        return;
    }
    
    // Group messages by order
    const ordersWithMessages = [...new Set(messages.map(msg => msg.orderId))];
    
    ordersWithMessages.forEach(orderId => {
        const orderMessages = messages.filter(msg => msg.orderId === orderId);
        const order = orders.find(o => o.id === orderId);
        
        if (order) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message-item';
            messageDiv.innerHTML = `
                <h4>Order #${orderId} - ${order.customerName}</h4>
                <p><strong>Status:</strong> <span class="order-status status-${order.status}">${order.status.toUpperCase()}</span></p>
                <p><strong>Last Message:</strong> ${orderMessages[orderMessages.length - 1].text}</p>
                <p><strong>Time:</strong> ${orderMessages[orderMessages.length - 1].time}</p>
            `;
            messagesContainer.appendChild(messageDiv);
        }
    });
}

function updateOrderStatus(orderIndex, status) {
    orders[orderIndex].status = status;
    saveToStorage('orders', orders);
    displayOrdersAdmin();
    updateAdminStats();
}

function addProduct() {
    const name = document.getElementById('pName').value;
    const img = document.getElementById('pImage').value;
    const price = document.getElementById('pPrice').value;
    const qty = document.getElementById('pQty').value;
    const desc = document.getElementById('pDesc').value;
    
    if(!name || !img || !price) {
        alert('Name, Image and Price are required');
        return;
    }
    
    products.push({
        name: name,
        image: img,
        price: price,
        quantity: qty || '0',
        description: desc || 'No description'
    });
    
    saveToStorage('products', products);
    displayAdmin();
    displayProducts();
    
    // Reset form
    document.getElementById('pName').value = '';
    document.getElementById('pImage').value = '';
    document.getElementById('pPrice').value = '';
    document.getElementById('pQty').value = '';
    document.getElementById('pDesc').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.querySelector('#dropZone p').textContent = '📁 Drag & drop product image here or click to browse';
    
    alert('Product added successfully!');
}

function deleteProduct(i) {
    if(confirm('Are you sure you want to delete this product?')) {
        products.splice(i, 1);
        saveToStorage('products', products);
        displayAdmin();
        displayProducts();
        updateAdminStats();
    }
}

function editProduct(i) {
    const p = products[i];
    const name = prompt('Name', p.name);
    if (name === null) return;
    
    const price = prompt('Price', p.price);
    if (price === null) return;
    
    const qty = prompt('Quantity', p.quantity);
    const desc = prompt('Description', p.description);
    
    if(!name || !price) return;
    
    products[i] = {
        name: name,
        image: p.image, // Keep existing image
        price: price,
        quantity: qty,
        description: desc
    };
    
    saveToStorage('products', products);
    displayAdmin();
    displayProducts();
    
    alert('Product updated successfully!');
}

// DATA EXPORT/IMPORT
function exportData() {
    const data = {
        products: products,
        orders: orders,
        messages: messages,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luciferfruits-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    alert('Data exported successfully!');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (confirm('This will replace all current data. Continue?')) {
                    if (data.products) products = data.products;
                    if (data.orders) orders = data.orders;
                    if (data.messages) messages = data.messages;
                    
                    saveToStorage('products', products);
                    saveToStorage('orders', orders);
                    saveToStorage('messages', messages);
                    
                    displayAdmin();
                    displayProducts();
                    updateAdminStats();
                    alert('Data imported successfully!');
                }
            } catch (error) {
                alert('Invalid backup file!');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// SIMPLE LUCIFER LOGIN
function openAdminLogin() {
    const password = prompt('Enter Lucifer Password:');
    if (password === "lucifer123") {
        window.location.href = 'admin.html';
    } else if (password) {
        alert('Wrong password!');
    }
}

// Close modals when clicking outside
document.addEventListener('click', function(event) {
    const modals = ['cartModal', 'checkoutModal', 'orderTrackingModal', 'contactModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            if (modalId === 'cartModal') closeCart();
            if (modalId === 'checkoutModal') closeCheckout();
            if (modalId === 'orderTrackingModal') closeOrderTracking();
            if (modalId === 'contactModal') closeContact();
        }
    });
});

// Handle form submissions
document.addEventListener('DOMContentLoaded', function() {
    const forms = document.querySelectorAll('form[netlify]');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            // Reduce stock when order is placed
            if (form.name === 'order') {
                cart.forEach(cartItem => {
                    const productIndex = products.findIndex(p => p.name === cartItem.name);
                    if (productIndex !== -1) {
                        const currentStock = parseInt(products[productIndex].quantity) || 0;
                        const newStock = currentStock - cartItem.quantity;
                        products[productIndex].quantity = Math.max(0, newStock).toString();
                    }
                });
                
                // Save updated products and clear cart
                saveToStorage('products', products);
                cart = [];
                saveToStorage('cart', cart);
                updateCartCount();
                
                // Also save order to localStorage for tracking
                const order = {
                    id: Date.now(),
                    customerName: form.customerName.value,
                    customerEmail: form.customerEmail.value,
                    customerGameID: form.customerGameID.value,
                    products: [...cart],
                    total: parseFloat(form.orderTotal.value),
                    status: 'processing',
                    date: new Date().toLocaleString()
                };
                orders.push(order);
                saveToStorage('orders', orders);
            }
        });
    });
});