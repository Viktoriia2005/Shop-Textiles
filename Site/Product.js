document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const requestedProductId = Number(urlParams.get("id"));

  const yearSpan = document.getElementById("year");
  const pageTitle = document.getElementById("pageTitle");
  const mainImage = document.getElementById("mainProductImage");
  const galleryPanel = document.querySelector(".gallery-panel");
  const galleryThumbs = document.getElementById("galleryThumbs");
  const prevButton = document.getElementById("prevImage");
  const nextButton = document.getElementById("nextImage");
  const quantityInput = document.getElementById("quantityInput");
  const decreaseQtyButton = document.getElementById("decreaseQty");
  const increaseQtyButton = document.getElementById("increaseQty");
  const addToCartButton = document.getElementById("addToCartButton");
  const productName = document.getElementById("productName");
  const productPrice = document.getElementById("productPrice");
  const productRating = document.getElementById("productRating");
  const productDescription = document.getElementById("productDescription");
  const productCode = document.querySelector(".product-code");
  const productStockBadge = document.getElementById("productStockBadge");

  const apiRoot = typeof API_BASE !== "undefined" ? API_BASE : "http://localhost:5000";
  let currentImageIndex = 0;
  let imageSources = mainImage ? [mainImage.getAttribute("src")] : [];

  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  const getThumbButtons = () => Array.from(document.querySelectorAll(".thumb-button"));

  const setActiveImage = (index) => {
    if (!mainImage || imageSources.length === 0) return;

    currentImageIndex = (index + imageSources.length) % imageSources.length;
    mainImage.src = imageSources[currentImageIndex];

    getThumbButtons().forEach((button, buttonIndex) => {
      const isActive = buttonIndex === currentImageIndex;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-current", isActive ? "true" : "false");
    });
  };

  const bindThumbButtons = () => {
    getThumbButtons().forEach((button, index) => {
      button.addEventListener("click", () => {
        setActiveImage(index);
      });
    });
  };

  const renderGalleryThumbs = (images) => {
    imageSources = Array.isArray(images) && images.length > 0 ? images : imageSources;

    if (!galleryPanel || !galleryThumbs || !mainImage || imageSources.length === 0) {
      return;
    }

    galleryThumbs.innerHTML = "";

    if (imageSources.length <= 1) {
      galleryPanel.classList.add("single-image");
      mainImage.src = imageSources[0];
      return;
    }

    galleryPanel.classList.remove("single-image");

    imageSources.forEach((image, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `thumb-button${index === 0 ? " active" : ""}`;
      button.dataset.image = image;
      button.setAttribute("aria-label", `Фото ${index + 1}`);
      button.innerHTML = `<img src="${image}" alt="Фото товару ${index + 1}">`;
      galleryThumbs.appendChild(button);
    });

    bindThumbButtons();
  };

  const normalizeQuantity = () => {
    if (!quantityInput) return 1;

    const safeValue = Math.max(1, parseInt(quantityInput.value, 10) || 1);
    quantityInput.value = safeValue;
    return safeValue;
  };

  const applyProductData = (product) => {
    if (!product || !addToCartButton) return;

    addToCartButton.dataset.productId = String(product.product_id);

    const photos = String(product.Photo || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (photos.length > 0) {
      renderGalleryThumbs(photos);
      setActiveImage(0);
    }

    if (productName && product.Name) {
      productName.textContent = product.Name;
      if (pageTitle) {
        pageTitle.textContent = product.Name;
      }
      document.title = product.Name;
    }

    if (productPrice && product.Price !== undefined && product.Price !== null) {
      productPrice.textContent = `${product.Price} ₴`;
    }

    if (productRating) {
      const ratingValue = product.Rating ?? "--";
      productRating.textContent = `${ratingValue} / 5`;
      productRating.setAttribute("aria-label", `Рейтинг ${ratingValue} з 5`);
    }

    if (productDescription && product.Description) {
      productDescription.textContent = product.Description;
    }

    if (productCode && product.product_id) {
      productCode.textContent = `Код товару: ${product.product_id}`;
    }

    if (productStockBadge) {
      const stockValue = Number(product.Stock);
      productStockBadge.textContent = stockValue > 0 ? "В наявності" : "Немає в наявності";
    }
  };

  const loadFallbackProduct = async () => {
    const response = await fetch(`${apiRoot}/products`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const products = await response.json();
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error("Товар не знайдено");
    }

    return products[0];
  };

  const loadProduct = async () => {
    if (!addToCartButton) return;

    try {
      let product;

      if (Number.isInteger(requestedProductId) && requestedProductId > 0) {
        const response = await fetch(`${apiRoot}/products/${requestedProductId}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        product = await response.json();
      } else {
        product = await loadFallbackProduct();
      }

      applyProductData(product);
    } catch (error) {
      console.warn("Не вдалося підвантажити товар із бази даних", error);
      if (productDescription) {
        productDescription.textContent = "Не вдалося завантажити опис товару з бази даних.";
      }
    }
  };

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      if (imageSources.length <= 1) return;
      setActiveImage(currentImageIndex - 1);
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      if (imageSources.length <= 1) return;
      setActiveImage(currentImageIndex + 1);
    });
  }

  if (quantityInput) {
    quantityInput.addEventListener("input", normalizeQuantity);
    quantityInput.addEventListener("blur", normalizeQuantity);
  }

  if (decreaseQtyButton) {
    decreaseQtyButton.addEventListener("click", () => {
      quantityInput.value = Math.max(1, normalizeQuantity() - 1);
    });
  }

  if (increaseQtyButton) {
    increaseQtyButton.addEventListener("click", () => {
      quantityInput.value = normalizeQuantity() + 1;
    });
  }

  if (addToCartButton) {
    addToCartButton.addEventListener("click", async () => {
      const rawUser = localStorage.getItem("user");
      const quantity = normalizeQuantity();
      const productId = Number(addToCartButton.dataset.productId);

      if (!rawUser) {
        window.location.href = "login.html";
        return;
      }

      if (!productId) {
        showPopup("Товар ще завантажується. Спробуйте ще раз.");
        return;
      }

      let user;

      try {
        user = JSON.parse(rawUser);
      } catch (error) {
        console.warn("Некоректний user у localStorage", error);
        window.location.href = "login.html";
        return;
      }

      if (!user || !user.user_id) {
        window.location.href = "login.html";
        return;
      }

      try {
        addToCartButton.disabled = true;

        const response = await fetch(`${apiRoot}/cart/quick-add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            user_id: user.user_id,
            product_id: productId,
            quantity
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Не вдалося додати товар");
        }

        showPopup(data.message || "Товар додано до кошика!");
      } catch (error) {
        console.error("Помилка додавання в кошик:", error);
        showPopup(error.message || "Не вдалося додати товар");
      } finally {
        addToCartButton.disabled = false;
      }
    });
  }

  if (mainImage) {
    mainImage.addEventListener("click", () => {
      if (imageSources.length <= 1) return;
      setActiveImage(currentImageIndex + 1);
    });
  }

  renderGalleryThumbs(imageSources);
  setActiveImage(0);
  loadProduct();
});

function showPopup(message, duration = 2000) {
  const popup = document.getElementById("popup-message");
  if (!popup) return;

  popup.textContent = message;
  popup.style.display = "block";
  popup.style.opacity = "1";

  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => {
      popup.style.display = "none";
    }, 300);
  }, duration);
}