document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("adminForm");
  const saveBtn = document.getElementById("save-btn");
  const deleteBtn = document.getElementById("delete-btn");
  const photoInput = document.getElementById("field-photo-file");
  const photoPath = document.getElementById("photo-file-path");
  const photoPreview = document.getElementById("photo-preview");
  const photoHidden = document.getElementById("field-photo");
  const backBtn = document.getElementById("back-to-catalog");
  const title = document.querySelector(".card-body h3");
  const nameField = document.getElementById("field-name");

  // Отримати параметри з URL
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

  if (productId) {
    // Режим редагування
    title.textContent = "Редагування товару";
    saveBtn.textContent = "Змінити";

    try {
      const res = await fetch(`${API_BASE}/products/${productId}`);
      const product = await res.json();

      console.log('editing product id', productId, 'server response', product);

      // Заповнити форму (враховуємо різні варіанти імен полів)
      document.getElementById("field-name").value = product.Name ?? product.name ?? "";
      document.getElementById("field-description").value = product.Description ?? product.description ?? "";
      document.getElementById("field-price").value = product.Price ?? product.price ?? "";
      document.getElementById("field-photo").value = product.Photo ?? product.photo ?? "";
      if (photoHidden) photoHidden.value = product.Photo ?? product.photo ?? "";
      if (photoPath) {
        const p = product.Photo ?? product.photo ?? "";
        photoPath.textContent = p ? `Path: ${p}` : "";
      }
      const previewSrc = product.Photo ?? product.photo ?? "";
      if (previewSrc) setPhotoPreview(previewSrc);
      document.getElementById("field-quantity").value = product.Stock ?? product.stock ?? "";
    } catch (err) {
      console.error("Помилка завантаження товару:", err);
    }
  } else {
    // Режим додавання
    title.textContent = "Додавання товару";
    saveBtn.textContent = "Додати";
  }

  // show temporary flash message using the existing popup element
  function showFlashMessage(msg, duration = 1600) {
    const popup = document.getElementById('popup-message');
    popup.textContent = msg;
    popup.style.display = 'block';
    // force reflow for transition
    popup.offsetWidth;
    popup.style.opacity = '1';
    setTimeout(() => {
      popup.style.opacity = '0';
      popup.addEventListener('transitionend', function handler() {
        popup.style.display = 'none';
        popup.removeEventListener('transitionend', handler);
      });
    }, duration);
  }

  // Збереження (додавання або редагування)

  function setPhotoPreview(src) {
    if (!photoPreview) return;
    if (src) {
      photoPreview.src = src;
      photoPreview.style.display = "block";
    } else {
      photoPreview.src = "";
      photoPreview.style.display = "none";
    }
  }

  if (photoInput) {
    photoInput.addEventListener("change", () => {
      const file = photoInput.files && photoInput.files[0];
      if (file) {
        if (photoPath) photoPath.textContent = `Path: img/${file.name}`;
        if (photoHidden) photoHidden.value = `img/${file.name}`;

        const reader = new FileReader();
        reader.onload = (e) => {
          setPhotoPreview(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        if (photoPath) photoPath.textContent = "";
        if (photoHidden) photoHidden.value = "";
        setPhotoPreview("");
      }
    });
  }

  if (nameField) {
    nameField.addEventListener("input", () => {
      const cleaned = nameField.value.replace(/\d+/g, "");
      if (cleaned !== nameField.value) {
        nameField.value = cleaned;
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const productData = {
      name: document.getElementById("field-name").value.replace(/\d+/g, "").trim(),
      description: document.getElementById("field-description").value.trim(),
      price: parseFloat(document.getElementById("field-price").value),
      photo: (document.getElementById("field-photo").value || "").trim(),
      stock: parseInt(document.getElementById("field-quantity").value) || 0,
    };

    try {
      let res;
      if (productId) {
        // PUT для редагування
        res = await fetch(`${API_BASE}/products/${productId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        showFlashMessage("Товар успішно змінено!");
      } else {
        // POST для додавання
        res = await fetch(`${API_BASE}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        showFlashMessage("Товар успішно додано!");
      }
      // почекаємо трохи аби користувач побачив повідомлення
      setTimeout(() => { window.location.href = "admin.html"; }, 1600);
    } catch (err) {
      console.error("Помилка збереження товару:", err);
      alert("Не вдалося зберегти товар");
    }
  });

  // Повернення до каталогу
  if (backBtn) {
    backBtn.addEventListener("click", (e) => {
      e.preventDefault(); // щоб не було конфлікту з формою
      window.location.href = "admin.html"; // твоя головна сторінка
    });
  }

  // ------------------ Вивід імені адміна ------------------
  async function loadAdminName() {
    try {
      const adminId = localStorage.getItem("adminId");
      if (!adminId) return;

      const res = await fetch(`${API_BASE}/users/admin/${adminId}`);
      const admin = await res.json();

      document.getElementById("admin-name").textContent = admin.Name;
    } catch (err) {
      console.error("Помилка отримання імені адміна:", err);
    }
  }

  // ✅ Викликаємо напряму
  loadAdminName();
});
