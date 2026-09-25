/**
 * SHOPORA — Multi-Step Checkout Controller
 * "Discover More. Shop Smarter."
 * Real-App Commercial Flipkart / Amazon / Apple Style Checkout Experience
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Components.renderNavbar('cart');
  Components.renderFooter();

  // Authentication Guard
  if (!Auth.isAuthenticated()) {
    Components.showToast('Please sign in to proceed with checkout', 'warning');
    setTimeout(() => {
      window.location.href = `login.html?redirect=${encodeURIComponent('checkout.html')}`;
    }, 600);
    return;
  }

  // Cart Guard
  const items = Cart.getItems();
  if (items.length === 0) {
    Components.showToast('Your shopping cart is empty', 'warning');
    setTimeout(() => {
      window.location.href = 'cart.html';
    }, 500);
    return;
  }

  // Indian & Major Pincode Lookup Directory
  const PIN_DIRECTORY = {
    '560': { city: 'Bengaluru', state: 'Karnataka' },
    '400': { city: 'Mumbai', state: 'Maharashtra' },
    '401': { city: 'Thane / Mumbai', state: 'Maharashtra' },
    '110': { city: 'New Delhi', state: 'Delhi' },
    '500': { city: 'Hyderabad', state: 'Telangana' },
    '600': { city: 'Chennai', state: 'Tamil Nadu' },
    '700': { city: 'Kolkata', state: 'West Bengal' },
    '411': { city: 'Pune', state: 'Maharashtra' },
    '380': { city: 'Ahmedabad', state: 'Gujarat' },
    '302': { city: 'Jaipur', state: 'Rajasthan' },
    '122': { city: 'Gurugram', state: 'Haryana' },
    '201': { city: 'Noida', state: 'Uttar Pradesh' },
    '682': { city: 'Kochi', state: 'Kerala' },
    '226': { city: 'Lucknow', state: 'Uttar Pradesh' },
    '440': { city: 'Nagpur', state: 'Maharashtra' },
    '452': { city: 'Indore', state: 'Madhya Pradesh' },
    '160': { city: 'Chandigarh', state: 'Chandigarh' },
    '800': { city: 'Patna', state: 'Bihar' },
    '781': { city: 'Guwahati', state: 'Assam' },
    '97477': { city: 'Springfield', state: 'OR' },
    '94105': { city: 'San Francisco', state: 'CA' },
    '95134': { city: 'San Jose', state: 'CA' },
  };

  const lookupPin = (pin) => {
    if (!pin) return null;
    const p = pin.trim();
    if (PIN_DIRECTORY[p]) return PIN_DIRECTORY[p];
    const prefix3 = p.slice(0, 3);
    if (PIN_DIRECTORY[prefix3]) return PIN_DIRECTORY[prefix3];
    return null;
  };

  // State
  let user = Auth.getUser() || {};
  let isProUser = Boolean(user.isPro);
  let savedAddresses = [];
  let selectedAddress = null;

  // DOM Elements
  const step1Box = document.getElementById('step-1-address-box');
  const confirmedBanner = document.getElementById('confirmed-address-banner');
  const confirmedName = document.getElementById('confirmed-addr-name');
  const confirmedDetail = document.getElementById('confirmed-addr-detail');
  const confirmedPhone = document.getElementById('confirmed-addr-phone');
  const changeAddrBtn = document.getElementById('change-address-btn');

  const savedAddressesContainer = document.getElementById('saved-addresses-container');
  const toggleNewAddressBtn = document.getElementById('toggle-new-address-btn');
  const formWrap = document.getElementById('collapsible-address-form-wrap');
  const addressForm = document.getElementById('address-form');
  const formHeading = document.getElementById('address-form-heading');
  const closeFormBtn = document.getElementById('close-address-form-btn');
  const cancelFormBtn = document.getElementById('cancel-new-address-btn');

  const editIdInput = document.getElementById('edit-address-id');
  const nameInput = document.getElementById('ship-name');
  const phoneInput = document.getElementById('ship-phone');
  const pincodeInput = document.getElementById('ship-pincode');
  const landmarkInput = document.getElementById('ship-landmark');
  const streetInput = document.getElementById('ship-street');
  const cityInput = document.getElementById('ship-city');
  const stateInput = document.getElementById('ship-state');
  const typeInput = document.getElementById('ship-type');
  const isDefaultInput = document.getElementById('ship-is-default');
  const pincodeHint = document.getElementById('chk-pincode-hint');

  // Delivery Speed Elements
  const speedExpressRadio = document.querySelector('input[name="delivery-speed"][value="express"]');
  const speedStandardRadio = document.querySelector('input[name="delivery-speed"][value="standard"]');
  const optExpressCard = document.getElementById('opt-speed-express');
  const optStandardCard = document.getElementById('opt-speed-standard');
  const expressFeeDisplay = document.getElementById('express-fee-display');
  const expressFeeStrikethrough = document.getElementById('express-fee-strikethrough');
  const standardFeeDisplay = document.getElementById('standard-fee-display');
  const step2ProCta = document.getElementById('step2-pro-cta-box');
  const step2ProBtn = document.getElementById('step2-pro-trial-btn');

  // Summary Elements
  const itemsList = document.getElementById('checkout-items-list');
  const subtotalEl = document.getElementById('chk-subtotal');
  const shippingEl = document.getElementById('chk-shipping');
  const proDiscountRow = document.getElementById('chk-pro-discount-row');
  const proDiscountEl = document.getElementById('chk-pro-discount');
  const totalEl = document.getElementById('chk-total');
  const summaryProBanner = document.getElementById('chk-pro-summary-banner');
  const sidebarProBtn = document.getElementById('sidebar-pro-trial-btn');
  const placeOrderBtn = document.getElementById('place-order-submit-btn');

  // Mini Items List
  itemsList.innerHTML = items
    .map(
      (item) => `
    <div class="checkout-item-mini">
      <img src="${item.image}" alt="${item.name}" onerror="Utils.imgFallback(this)" />
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${item.name}
        </div>
        <div style="font-size: 0.78rem; color: var(--text-muted);">
          Qty: ${item.quantity} &times; ${Utils.formatPrice(item.price)}
        </div>
      </div>
      <div style="font-size: 0.9rem; font-weight: 800; color: var(--text-main);">
        ${Utils.formatPrice(item.price * item.quantity)}
      </div>
    </div>
  `
    )
    .join('');

  // Live Dispatch Countdown Clock (Guaranteed next-day delivery cutoff)
  const dispatchClockEl = document.getElementById('dispatch-timer-clock');
  if (dispatchClockEl) {
    let remainingSeconds = 2 * 3600 + 45 * 60 + 18; // 02h 45m 18s
    setInterval(() => {
      if (remainingSeconds > 0) remainingSeconds--;
      const h = String(Math.floor(remainingSeconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((remainingSeconds % 3600) / 60)).padStart(2, '0');
      const s = String(remainingSeconds % 60).padStart(2, '0');
      dispatchClockEl.textContent = `${h}h ${m}m ${s}s`;
    }, 1000);
  }

  // Live UPI QR Validity Clock (10 minutes countdown)
  const upiTimerEl = document.getElementById('upi-timer-display');
  if (upiTimerEl) {
    let upiSeconds = 599; // 09:59
    setInterval(() => {
      if (upiSeconds > 0) upiSeconds--;
      const m = String(Math.floor(upiSeconds / 60)).padStart(2, '0');
      const s = String(upiSeconds % 60).padStart(2, '0');
      upiTimerEl.textContent = `${m}:${s}`;
    }, 1000);
  }

  // Calculate Order Totals with Pro Perks & Speed
  function calculateTotals() {
    const subtotal = Cart.getSubtotal();
    const isExpress = speedExpressRadio ? speedExpressRadio.checked : true;

    // Shipping Fee
    let shippingFee = 0;
    if (isExpress) {
      shippingFee = isProUser ? 0 : 149;
    } else {
      shippingFee = subtotal >= 999 || isProUser ? 0 : 49;
    }

    // Pro 5% Member Savings
    const proSavings = isProUser ? Math.round(subtotal * 0.05) : 0;
    const finalTotal = Math.max(0, subtotal + shippingFee - proSavings);

    // Update Summary UI
    if (subtotalEl) subtotalEl.textContent = Utils.formatPrice(subtotal);
    if (shippingEl) {
      if (shippingFee === 0) {
        shippingEl.innerHTML = '<strong style="color: #16a34a;">FREE</strong>';
      } else {
        // Dark slate neutral color for paid shipping (not misleading green!)
        shippingEl.innerHTML = `<strong style="color: #0f172a;">${Utils.formatPrice(shippingFee)}</strong>`;
      }
    }

    if (proDiscountRow && proDiscountEl) {
      if (isProUser && proSavings > 0) {
        proDiscountRow.style.display = 'flex';
        proDiscountEl.textContent = `-${Utils.formatPrice(proSavings)}`;
      } else {
        proDiscountRow.style.display = 'none';
      }
    }

    if (totalEl) totalEl.textContent = Utils.formatPrice(finalTotal);

    // Update Speed Option Cards UI
    if (expressFeeDisplay) {
      if (isProUser) {
        expressFeeDisplay.innerHTML = '<strong style="color: #16a34a;">FREE</strong>';
        expressFeeDisplay.style.color = '#16a34a';
        if (expressFeeStrikethrough) expressFeeStrikethrough.style.display = 'inline-block';
      } else {
        // Paid fee should be bold slate (#0f172a)
        expressFeeDisplay.textContent = '₹149';
        expressFeeDisplay.style.color = '#0f172a';
        if (expressFeeStrikethrough) expressFeeStrikethrough.style.display = 'none';
      }
    }

    if (standardFeeDisplay) {
      standardFeeDisplay.textContent = subtotal >= 999 || isProUser ? 'FREE' : '₹49';
      standardFeeDisplay.style.color = subtotal >= 999 || isProUser ? '#16a34a' : '#0f172a';
    }

    // Pro CTA Banners: Hide if already Pro
    if (step2ProCta) step2ProCta.style.display = isProUser ? 'none' : 'flex';
    if (summaryProBanner) summaryProBanner.style.display = isProUser ? 'none' : 'block';

    // Update Dynamic UPI QR Code Image with current total
    const dynamicQrImg = document.getElementById('dynamic-upi-qr-img');
    if (dynamicQrImg) {
      const qrData = encodeURIComponent(`upi://pay?pa=shopora.pay@icici&pn=SHOPORA%20Commerce&am=${finalTotal}&cu=INR`);
      dynamicQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`;
    }

    return { subtotal, shippingFee, proSavings, finalTotal };
  }

  // 1-Click Pro Trial Activation directly on Checkout Page
  async function activateProTrialFromCheckout() {
    try {
      if (step2ProBtn) step2ProBtn.disabled = true;
      if (sidebarProBtn) sidebarProBtn.disabled = true;

      const res = await API.post('/auth/pro/activate', { plan: 'trial' });
      if (res.success && res.data) {
        Auth.setUser(res.data);
        user = res.data;
        isProUser = true;

        Components.showToast('🎉 30-Day Pro Trial Activated! Free Express Delivery applied!', 'success');

        // Select Express delivery speed automatically
        if (speedExpressRadio) speedExpressRadio.checked = true;
        if (optExpressCard) {
          optExpressCard.classList.add('selected');
          // Golden celebration flash
          optExpressCard.style.transition = 'all 0.5s ease';
          optExpressCard.style.boxShadow = '0 0 25px rgba(245, 158, 11, 0.4)';
          setTimeout(() => {
            optExpressCard.style.boxShadow = '';
          }, 1500);
        }
        if (optStandardCard) optStandardCard.classList.remove('selected');

        calculateTotals();
        window.dispatchEvent(new CustomEvent('user:updated', { detail: res.data }));
      } else {
        throw new Error(res.message || 'Could not activate trial');
      }
    } catch (err) {
      Components.showToast(err.message || 'Could not activate Pro trial', 'error');
    } finally {
      if (step2ProBtn) step2ProBtn.disabled = false;
      if (sidebarProBtn) sidebarProBtn.disabled = false;
    }
  }

  if (step2ProBtn) step2ProBtn.addEventListener('click', activateProTrialFromCheckout);
  if (sidebarProBtn) sidebarProBtn.addEventListener('click', activateProTrialFromCheckout);

  // Delivery Speed Radio Change Listeners
  [speedExpressRadio, speedStandardRadio].forEach((radio) => {
    if (radio) {
      radio.addEventListener('change', () => {
        if (speedExpressRadio.checked) {
          if (optExpressCard) optExpressCard.classList.add('selected');
          if (optStandardCard) optStandardCard.classList.remove('selected');
        } else {
          if (optStandardCard) optStandardCard.classList.add('selected');
          if (optExpressCard) optExpressCard.classList.remove('selected');
        }
        calculateTotals();
      });
    }
  });

  // Pincode Live Auto-fill
  if (pincodeInput) {
    pincodeInput.addEventListener('input', () => {
      const val = pincodeInput.value.trim();
      if (val.length >= 3) {
        const match = lookupPin(val);
        if (match) {
          if (pincodeHint) {
            pincodeHint.style.display = 'block';
            pincodeHint.innerHTML = `✓ Verified: <strong>${match.city}, ${match.state}</strong> (Express Available)`;
          }
          if (val.length >= 5) {
            if (cityInput && !cityInput.value) cityInput.value = match.city;
            if (stateInput && !stateInput.value) stateInput.value = match.state;
          }
          return;
        }
      }
      if (pincodeHint) pincodeHint.style.display = 'none';
    });
  }

  // Address Type Pill Selector
  document.querySelectorAll('.address-type-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.address-type-pill').forEach((p) => p.classList.remove('selected'));
      pill.classList.add('selected');
      if (typeInput) typeInput.value = pill.dataset.type;
    });
  });

  // Load Saved Addresses from MongoDB
  async function loadAddresses() {
    try {
      const res = await API.get('/auth/addresses');
      savedAddresses = res.data || [];
      renderAddressCards();

      // Auto-select default or first address if none chosen
      if (!selectedAddress && savedAddresses.length > 0) {
        const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
        selectAddress(def);
      }
    } catch (err) {
      console.warn('Could not load user addresses from MongoDB:', err);
    }
  }

  // Render Amazon / Flipkart Style Address Cards
  function renderAddressCards() {
    if (!savedAddressesContainer) return;

    if (savedAddresses.length === 0) {
      savedAddressesContainer.innerHTML = `
        <div style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: var(--radius-md); padding: 18px; text-align: center; margin-bottom: 14px;">
          <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 8px;">No saved delivery addresses found in your account.</p>
          <span style="font-size: 0.8rem; color: var(--primary); font-weight: 700;">Click "+ Add a new delivery address" below to add one.</span>
        </div>
      `;
      return;
    }

    savedAddressesContainer.innerHTML = savedAddresses
      .map((addr) => {
        const isSelected = selectedAddress && String(selectedAddress._id) === String(addr._id);
        const typeClass = (addr.addressType || 'Home').toLowerCase();
        const street = addr.addressLine1 || addr.street || '';
        const pin = addr.pincode || addr.postalCode || '';

        return `
          <div class="checkout-address-card-real ${isSelected ? 'selected' : ''}" data-id="${addr._id}">
            <div class="checkout-address-card-top">
              <input type="radio" name="checkout-address-radio" ${isSelected ? 'checked' : ''} />
              <div class="checkout-address-body">
                <div class="checkout-address-name-row">
                  <span class="checkout-address-name">📍 ${addr.fullName}</span>
                  <span class="badge-addr-type ${typeClass}">${addr.addressType || 'Home'}</span>
                  ${addr.isDefault ? '<span class="badge-addr-default">DEFAULT</span>' : ''}
                </div>
                <div class="checkout-address-text">
                  ${street}${addr.landmark ? ', Landmark: ' + addr.landmark : ''}, ${addr.city}, ${addr.state} - <strong>${pin}</strong>
                </div>
                <div class="checkout-address-phone">
                  📞 ${addr.phone}
                </div>
                <div class="checkout-address-actions">
                  <button type="button" class="btn-deliver-here" data-id="${addr._id}">
                    DELIVER TO THIS ADDRESS ➔
                  </button>
                  <button type="button" class="btn-addr-action" data-action="edit" data-id="${addr._id}">
                    ✏️ Edit
                  </button>
                  <button type="button" class="btn-addr-action delete" data-action="delete" data-id="${addr._id}">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    // Attach card event listeners
    savedAddressesContainer.querySelectorAll('.checkout-address-card-real').forEach((card) => {
      const id = card.dataset.id;
      const addr = savedAddresses.find((a) => String(a._id) === String(id));

      // Clicking card body selects it
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-deliver-here') || e.target.closest('.btn-addr-action')) return;
        selectAddress(addr);
      });

      // "DELIVER TO THIS ADDRESS" Button
      const deliverBtn = card.querySelector('.btn-deliver-here');
      if (deliverBtn) {
        deliverBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          selectAddress(addr);
          confirmStep1Address();
        });
      }

      // Edit Button
      const editBtn = card.querySelector('[data-action="edit"]');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditAddressForm(addr);
        });
      }

      // Delete Button
      const deleteBtn = card.querySelector('[data-action="delete"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteAddressPrompt(addr);
        });
      }
    });
  }

  // Select an Address
  function selectAddress(addr) {
    if (!addr) return;
    selectedAddress = addr;

    // Sync input fields for compatibility
    if (nameInput) nameInput.value = addr.fullName || '';
    if (phoneInput) phoneInput.value = addr.phone || '';
    if (streetInput) streetInput.value = addr.addressLine1 || addr.street || '';
    if (landmarkInput) landmarkInput.value = addr.landmark || '';
    if (cityInput) cityInput.value = addr.city || '';
    if (stateInput) stateInput.value = addr.state || '';
    if (pincodeInput) pincodeInput.value = addr.pincode || addr.postalCode || '';
    if (typeInput) typeInput.value = addr.addressType || 'Home';
    if (isDefaultInput) isDefaultInput.checked = Boolean(addr.isDefault);

    // Update Radio and Selection Styling
    if (savedAddressesContainer) {
      savedAddressesContainer.querySelectorAll('.checkout-address-card-real').forEach((c) => {
        const isMatch = String(c.dataset.id) === String(addr._id);
        c.classList.toggle('selected', isMatch);
        const radio = c.querySelector('input[type="radio"]');
        if (radio) radio.checked = isMatch;
      });
    }
  }

  // Confirm Step 1 and Collapse into Confirmed Summary Banner
  function confirmStep1Address() {
    if (!selectedAddress) {
      Components.showToast('Please select or add a delivery address', 'warning');
      return;
    }

    if (confirmedName) confirmedName.textContent = selectedAddress.fullName;
    if (confirmedDetail) {
      const street = selectedAddress.addressLine1 || selectedAddress.street || '';
      const pin = selectedAddress.pincode || selectedAddress.postalCode || '';
      confirmedDetail.textContent = `${street}${selectedAddress.landmark ? ', Landmark: ' + selectedAddress.landmark : ''}, ${selectedAddress.city}, ${selectedAddress.state} - ${pin}`;
    }
    if (confirmedPhone) confirmedPhone.textContent = `Phone: ${selectedAddress.phone}`;

    // Collapse Step 1 Box, Show Confirmed Banner
    step1Box.style.display = 'none';
    confirmedBanner.classList.add('visible');

    // Update Stepper Line & Node
    const stepNode1 = document.getElementById('step-node-1');
    const stepLine1 = document.getElementById('step-line-1');
    if (stepNode1) {
      stepNode1.classList.add('completed');
      stepNode1.querySelector('.checkout-step-circle').textContent = '✓';
    }
    if (stepLine1) stepLine1.classList.add('completed');

    Components.showToast(`Delivery set to ${selectedAddress.city} (${selectedAddress.pincode || selectedAddress.postalCode || ''})`, 'success');

    // Smoothly scroll and highlight Step 2 with active pulse
    const step2 = document.getElementById('step-2-delivery-box');
    if (step2) {
      step2.classList.add('step-active-highlight');
      setTimeout(() => step2.classList.remove('step-active-highlight'), 1800);
      step2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Change Address: Re-open Step 1
  if (changeAddrBtn) {
    changeAddrBtn.addEventListener('click', () => {
      confirmedBanner.classList.remove('visible');
      step1Box.style.display = 'block';
      step1Box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // Toggle Add New Address Form
  if (toggleNewAddressBtn) {
    toggleNewAddressBtn.addEventListener('click', () => {
      editIdInput.value = '';
      formHeading.textContent = 'Add a New Delivery Address';
      addressForm.reset();

      if (nameInput && user?.name) nameInput.value = user.name;
      if (phoneInput && user?.phone) phoneInput.value = user.phone;
      if (typeInput) typeInput.value = 'Home';

      document.querySelectorAll('.address-type-pill').forEach((p) => {
        p.classList.toggle('selected', p.dataset.type === 'Home');
      });

      formWrap.style.display = 'block';
      formWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      if (nameInput) nameInput.focus();
    });
  }

  // Open Edit Address Form
  function openEditAddressForm(addr) {
    if (!addr) return;
    editIdInput.value = addr._id;
    formHeading.textContent = 'Edit Delivery Address';

    if (nameInput) nameInput.value = addr.fullName || '';
    if (phoneInput) phoneInput.value = addr.phone || '';
    if (pincodeInput) pincodeInput.value = addr.pincode || addr.postalCode || '';
    if (landmarkInput) landmarkInput.value = addr.landmark || '';
    if (streetInput) streetInput.value = addr.addressLine1 || addr.street || '';
    if (cityInput) cityInput.value = addr.city || '';
    if (stateInput) stateInput.value = addr.state || '';
    if (typeInput) typeInput.value = addr.addressType || 'Home';
    if (isDefaultInput) isDefaultInput.checked = Boolean(addr.isDefault);

    document.querySelectorAll('.address-type-pill').forEach((p) => {
      p.classList.toggle('selected', p.dataset.type === (addr.addressType || 'Home'));
    });

    formWrap.style.display = 'block';
    formWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (streetInput) streetInput.focus();
  }

  // Close / Cancel Address Form
  const closeForm = () => {
    formWrap.style.display = 'none';
    editIdInput.value = '';
  };

  if (closeFormBtn) closeFormBtn.addEventListener('click', closeForm);
  if (cancelFormBtn) cancelFormBtn.addEventListener('click', closeForm);

  // Delete Address
  function deleteAddressPrompt(addr) {
    Components.confirmModal({
      title: 'Remove Delivery Address?',
      message: `Are you sure you want to remove the address for "${addr.fullName}"?`,
      confirmText: 'Yes, Remove',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await API.delete(`/auth/addresses/${addr._id}`);
          Components.showToast('Address deleted successfully', 'info');
          if (selectedAddress && String(selectedAddress._id) === String(addr._id)) {
            selectedAddress = null;
          }
          await loadAddresses();
        } catch (err) {
          Components.showToast(err.message || 'Failed to delete address', 'error');
        }
      },
    });
  }

  // Handle Address Form Submit (Save to MongoDB via POST/PUT)
  if (addressForm) {
    addressForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const editId = editIdInput.value.trim();
      const fullName = nameInput.value.trim();
      const phone = phoneInput.value.trim();
      const pincode = pincodeInput.value.trim();
      const landmark = landmarkInput.value.trim();
      const addressLine1 = streetInput.value.trim();
      const city = cityInput.value.trim();
      const state = stateInput.value.trim();
      const addressType = typeInput ? typeInput.value : 'Home';
      const isDefault = isDefaultInput ? isDefaultInput.checked : false;

      if (!fullName || !phone || !pincode || !addressLine1 || !city || !state) {
        Components.showToast('Please fill in all mandatory fields (*)', 'error');
        return;
      }

      const saveBtn = document.getElementById('save-address-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving to MongoDB...';
      }

      try {
        const payload = {
          fullName,
          phone,
          addressLine1,
          street: addressLine1,
          landmark,
          city,
          state,
          pincode,
          postalCode: pincode,
          addressType,
          isDefault,
          country: 'India',
        };

        let res;
        if (editId) {
          res = await API.put(`/auth/addresses/${editId}`, payload);
        } else {
          res = await API.post('/auth/addresses', payload);
        }

        if (res.success) {
          Components.showToast(editId ? 'Address updated in MongoDB!' : 'New address saved to MongoDB profile!', 'success');
          closeForm();
          await loadAddresses();

          let activeAddr = null;
          if (editId) {
            activeAddr = savedAddresses.find((a) => String(a._id) === String(editId));
          } else if (res.address) {
            activeAddr = res.address;
          } else if (savedAddresses.length > 0) {
            activeAddr = savedAddresses[savedAddresses.length - 1];
          }

          if (activeAddr) {
            selectAddress(activeAddr);
            confirmStep1Address();
          }
        } else {
          throw new Error(res.message || 'Failed to save address');
        }
      } catch (err) {
        console.error('Address save error:', err);
        Components.showToast(err.message || 'Failed to save address. Please check input.', 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save and Deliver Here';
        }
      }
    });
  }

  // ==========================================================================
  // Comprehensive Real-Time Payment Methods Suite
  // ==========================================================================
  const paymentOptionCards = document.querySelectorAll('.checkout-payment-option');
  
  function updatePlaceOrderButtonText() {
    if (!placeOrderBtn) return;
    const totals = calculateTotals();
    const checked = document.querySelector('input[name="payment-method"]:checked');
    const method = checked ? checked.value : 'Instant UPI';

    if (method.includes('UPI')) {
      placeOrderBtn.innerHTML = `⚡ Pay ${Utils.formatPrice(totals.finalTotal)} with UPI &amp; Place Order`;
    } else if (method.includes('Cash') || method.includes('COD')) {
      placeOrderBtn.innerHTML = `💵 Place Order with Cash on Delivery (${Utils.formatPrice(totals.finalTotal)})`;
    } else if (method.includes('Card')) {
      placeOrderBtn.innerHTML = `💳 Pay ${Utils.formatPrice(totals.finalTotal)} with Card &amp; Place Order`;
    } else if (method.includes('Net') || method.includes('Bank')) {
      placeOrderBtn.innerHTML = `🏛️ Pay ${Utils.formatPrice(totals.finalTotal)} via Net Banking &amp; Place Order`;
    } else {
      placeOrderBtn.innerHTML = `🔒 Confirm &amp; Place Order (${Utils.formatPrice(totals.finalTotal)})`;
    }
  }

  paymentOptionCards.forEach((card) => {
    const radio = card.querySelector('input[name="payment-method"]');

    const selectThisPayment = () => {
      paymentOptionCards.forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      if (radio) radio.checked = true;
      updatePlaceOrderButtonText();
    };

    card.addEventListener('click', (e) => {
      // Don't override if user is interacting with inputs, selects, or action buttons
      if (e.target.closest('input') && e.target !== radio) return;
      if (e.target.closest('select') || e.target.closest('button')) return;
      selectThisPayment();
    });

    if (radio) {
      radio.addEventListener('change', selectThisPayment);
    }
  });

  // UPI Sub-view Tabs (QR vs VPA)
  const tabUpiQr = document.getElementById('tab-upi-qr');
  const tabUpiVpa = document.getElementById('tab-upi-vpa');
  const upiQrView = document.getElementById('upi-qr-view');
  const upiVpaView = document.getElementById('upi-vpa-view');

  if (tabUpiQr && tabUpiVpa) {
    tabUpiQr.addEventListener('click', () => {
      tabUpiQr.classList.add('active');
      tabUpiVpa.classList.remove('active');
      if (upiQrView) upiQrView.style.display = 'block';
      if (upiVpaView) upiVpaView.style.display = 'none';
    });

    tabUpiVpa.addEventListener('click', () => {
      tabUpiVpa.classList.add('active');
      tabUpiQr.classList.remove('active');
      if (upiVpaView) upiVpaView.style.display = 'block';
      if (upiQrView) upiQrView.style.display = 'none';
    });
  }

  // UPI Approval Simulation
  const btnSimulateUpi = document.getElementById('btn-simulate-upi-approval');
  const upiListenerStatus = document.getElementById('upi-listener-status');
  if (btnSimulateUpi) {
    btnSimulateUpi.addEventListener('click', () => {
      if (upiListenerStatus) {
        upiListenerStatus.innerHTML = '✅ <strong style="color: #16a34a;">Authorized via GPay/PhonePe! Ready to confirm order.</strong>';
      }
      Components.showToast('⚡ UPI transaction pre-authorized with your bank!', 'success');
    });
  }

  // UPI VPA Verification
  const btnVerifyVpa = document.getElementById('btn-verify-vpa');
  const vpaInput = document.getElementById('upi-vpa-input');
  const vpaResult = document.getElementById('vpa-verify-result');
  if (btnVerifyVpa && vpaInput) {
    btnVerifyVpa.addEventListener('click', () => {
      const vpa = vpaInput.value.trim();
      if (!vpa || !vpa.includes('@')) {
        Components.showToast('Please enter a valid VPA (e.g. yourname@okhdfcbank)', 'error');
        return;
      }
      btnVerifyVpa.disabled = true;
      btnVerifyVpa.textContent = 'Verifying with NPCI...';
      setTimeout(() => {
        btnVerifyVpa.disabled = false;
        btnVerifyVpa.textContent = 'Verified ✓';
        btnVerifyVpa.style.background = '#16a34a';
        if (vpaResult) {
          vpaResult.style.display = 'block';
          vpaResult.innerHTML = `✓ <strong>NPCI Verified:</strong> Payment mandate active for ${vpa}`;
        }
        Components.showToast('UPI ID successfully verified with NPCI!', 'success');
      }, 600);
    });
  }

  // Interactive Virtual Card Preview & Inputs
  const cardNumInput = document.getElementById('card-num-input');
  const cardNameInput = document.getElementById('card-name-input');
  const cardExpInput = document.getElementById('card-exp-input');
  const previewCardBrand = document.getElementById('preview-card-brand');
  const previewCardNumber = document.getElementById('preview-card-number');
  const previewCardName = document.getElementById('preview-card-name');
  const previewCardExp = document.getElementById('preview-card-exp');

  if (cardNumInput) {
    cardNumInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 16);
      let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
      e.target.value = formatted;

      if (previewCardNumber) {
        previewCardNumber.textContent = formatted || '•••• •••• •••• ••••';
      }

      // Brand Detection
      if (previewCardBrand) {
        if (val.startsWith('4')) {
          previewCardBrand.textContent = 'VISA';
          previewCardBrand.style.color = '#38bdf8';
        } else if (/^(5[1-5]|2[2-7])/.test(val)) {
          previewCardBrand.textContent = 'MASTERCARD';
          previewCardBrand.style.color = '#f97316';
        } else if (/^(60|65|81|82)/.test(val)) {
          previewCardBrand.textContent = 'RUPAY';
          previewCardBrand.style.color = '#10b981';
        } else if (/^(34|37)/.test(val)) {
          previewCardBrand.textContent = 'AMEX';
          previewCardBrand.style.color = '#60a5fa';
        } else {
          previewCardBrand.textContent = 'CARD';
          previewCardBrand.style.color = '#ffffff';
        }
      }
    });
  }

  if (cardNameInput) {
    cardNameInput.addEventListener('input', (e) => {
      if (previewCardName) {
        previewCardName.textContent = e.target.value.toUpperCase() || 'YOUR NAME';
      }
    });
  }

  if (cardExpInput) {
    cardExpInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 4);
      if (val.length >= 3) {
        val = val.substring(0, 2) + '/' + val.substring(2);
      }
      e.target.value = val;
      if (previewCardExp) {
        previewCardExp.textContent = val || 'MM/YY';
      }
    });
  }

  // Net Banking Chips Selection
  document.querySelectorAll('.bank-select-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.bank-select-chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });

  // ==========================================================================
  // Multi-Stage Real-Time Order Placement
  // ==========================================================================
  const processingOverlay = document.getElementById('checkout-processing-overlay');

  function setProcStep(stepNum, status) {
    const stepEl = document.getElementById(`proc-step-${stepNum}`);
    const iconEl = document.getElementById(`proc-icon-${stepNum}`);
    if (!stepEl) return;

    if (status === 'completed') {
      stepEl.classList.remove('active');
      stepEl.classList.add('completed');
      if (iconEl) iconEl.innerHTML = '✓';
    } else if (status === 'active') {
      stepEl.classList.add('active');
      stepEl.classList.remove('completed');
    }
  }

  let isPlacingOrder = false;

  async function executePlaceOrder(overrideMethod = null) {
    if (isPlacingOrder) return;

    // Address verification with seamless auto-selection fallbacks
    if (!selectedAddress) {
      if (savedAddresses && savedAddresses.length > 0) {
        selectedAddress = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
      } else {
        const fullName = nameInput ? nameInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const street = streetInput ? streetInput.value.trim() : '';
        const city = cityInput ? cityInput.value.trim() : '';
        const stateVal = stateInput ? stateInput.value.trim() : '';
        const postalCode = pincodeInput ? pincodeInput.value.trim() : '';

        if (!fullName || !phone || !street || !city || !stateVal || !postalCode) {
          Components.showToast('Please select or provide a verified delivery address in Step 1 first', 'error');
          step1Box.style.display = 'block';
          step1Box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return;
        }

        selectedAddress = {
          fullName,
          phone,
          addressLine1: street,
          street,
          city,
          state: stateVal,
          pincode: postalCode,
          postalCode,
          country: 'India',
          addressType: 'Home',
        };
      }
    }

    const selectedSpeed = speedExpressRadio && speedExpressRadio.checked ? 'express' : 'standard';
    const checkedPayment = document.querySelector('input[name="payment-method"]:checked');
    const selectedPaymentMethod = overrideMethod || (checkedPayment ? checkedPayment.value : 'Instant UPI');

    // Ensure the radio and card match the payment method used
    paymentOptionCards.forEach((c) => {
      const radio = c.querySelector('input[name="payment-method"]');
      if (radio && radio.value === selectedPaymentMethod) {
        radio.checked = true;
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });

    isPlacingOrder = true;

    // Show Full-Screen Glassmorphic Processing Overlay
    const procActiveCard = document.getElementById('proc-card-active');
    const successCard = document.getElementById('order-success-view-card');
    if (procActiveCard) procActiveCard.style.display = 'block';
    if (successCard) successCard.style.display = 'none';

    if (processingOverlay) {
      processingOverlay.classList.add('visible');
    }
    setProcStep(1, 'active');

    const streetVal = selectedAddress.addressLine1 || selectedAddress.street || selectedAddress.address || 'Address Line';
    const pinVal = selectedAddress.pincode || selectedAddress.postalCode || '560001';

    const orderPayload = {
      items: items.map((i) => ({
        product: i._id || i.product,
        quantity: i.quantity,
      })),
      shippingAddress: {
        fullName: selectedAddress.fullName || user.name || 'Valued Customer',
        phone: selectedAddress.phone || user.phone || '+91 98765 43210',
        addressLine1: streetVal,
        street: streetVal,
        landmark: selectedAddress.landmark || '',
        city: selectedAddress.city || 'Bengaluru',
        state: selectedAddress.state || 'Karnataka',
        pincode: pinVal,
        postalCode: pinVal,
        country: selectedAddress.country || 'India',
        addressType: selectedAddress.addressType || 'Home',
      },
      deliverySpeed: selectedSpeed,
      shippingMethod: selectedSpeed,
      paymentMethod: selectedPaymentMethod,
    };

    try {
      // Stage 1 -> Stage 2: Inventory reservation & priority dispatch
      await new Promise((r) => setTimeout(r, 450));
      setProcStep(1, 'completed');
      setProcStep(2, 'active');

      // Stage 2 -> Stage 3: Payment authorization
      await new Promise((r) => setTimeout(r, 450));
      setProcStep(2, 'completed');
      setProcStep(3, 'active');

      // Execute Order API Request with MongoDB
      const res = await API.post('/orders', orderPayload);

      if (res.success && res.data) {
        // Stage 3 -> Stage 4: Order Confirmed
        await new Promise((r) => setTimeout(r, 400));
        setProcStep(3, 'completed');
        setProcStep(4, 'completed');

        // Clear shopping cart
        await Cart.clear();
        localStorage.setItem('shopora_last_order', JSON.stringify(res.data));

        // Switch to Triumphant Order Success View
        await new Promise((r) => setTimeout(r, 300));
        if (procActiveCard) procActiveCard.style.display = 'none';
        if (successCard) {
          successCard.style.display = 'block';

          const orderNumEl = document.getElementById('success-order-number');
          const orderPayEl = document.getElementById('success-order-payment');
          const orderTotEl = document.getElementById('success-order-total');
          const viewOrdersBtn = document.getElementById('btn-redirect-my-orders');
          const viewTrackingBtn = document.getElementById('btn-redirect-tracking');
          const countdownEl = document.getElementById('redirect-orders-countdown');

          const orderNum = res.data.orderNumber || res.data._id;
          if (orderNumEl) orderNumEl.textContent = orderNum;
          if (orderPayEl) orderPayEl.textContent = `${res.data.paymentMethod} (${res.data.paymentStatus || 'Verified'})`;
          if (orderTotEl) orderTotEl.textContent = Utils.formatPrice(res.data.totalAmount || res.data.total || 0);

          if (viewOrdersBtn) {
            viewOrdersBtn.href = 'orders.html';
          }
          if (viewTrackingBtn) {
            viewTrackingBtn.href = `order-tracking.html?orderId=${res.data._id}`;
          }

          // Automatically redirect to Orders page after 6 seconds if user doesn't click immediately
          let secondsLeft = 6;
          const timer = setInterval(() => {
            secondsLeft--;
            if (countdownEl) countdownEl.textContent = secondsLeft;
            if (secondsLeft <= 0) {
              clearInterval(timer);
              window.location.href = 'orders.html';
            }
          }, 1000);
        } else {
          Components.showToast('🎉 Order placed successfully! Redirecting to orders...', 'success');
          setTimeout(() => {
            window.location.href = 'orders.html';
          }, 800);
        }
      } else {
        throw new Error(res.message || 'Failed to place order');
      }
    } catch (err) {
      console.error('Order placement failed:', err);
      if (processingOverlay) {
        processingOverlay.classList.remove('visible');
      }
      Components.showToast(err.message || 'Failed to place order. Please try again.', 'error');
    } finally {
      isPlacingOrder = false;
    }
  }

  // Hook all Dedicated Pay Now buttons inside each payment method
  document.querySelectorAll('.btn-pay-now-inside').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const method = btn.dataset.method;
      executePlaceOrder(method);
    });
  });

  // Hook Sidebar Place Order Button
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', () => executePlaceOrder());
  }

  // Initial Load of Addresses, Totals, and Button Text
  await loadAddresses();
  calculateTotals();
  updatePlaceOrderButtonText();
});
