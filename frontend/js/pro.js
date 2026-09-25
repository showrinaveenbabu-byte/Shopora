/**
 * SHOPORA PRO — Amazon Luxury Stores & Exclusive Member Privileges Controller
 * "Discover More. Shop Smarter."
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Render Flagship Navbar & Footer
  await Components.renderNavbar('pro');
  Components.renderFooter();

  // Elements
  const activeBanner = document.getElementById('active-pro-banner');
  const proExpiryText = document.getElementById('pro-expiry-text');
  const proDaysLeft = document.getElementById('pro-days-left');
  const proCurrentPlan = document.getElementById('pro-current-plan');
  const cancelBtn = document.getElementById('cancel-pro-sub-btn');
  const heroTrialBtn = document.getElementById('hero-start-trial-btn');

  // Luxury Vault Elements
  const luxuryContainer = document.getElementById('luxury-products-container');
  const filterBtns = document.querySelectorAll('.luxury-filter-btn');

  // Modal Elements
  const examineModal = document.getElementById('luxury-examine-modal');
  const examineContent = document.getElementById('luxury-modal-content');
  const closeExamineBtn = document.getElementById('modal-close-btn');

  // VIP Enrollment Modal Elements
  const enrollModal = document.getElementById('vip-enrollment-modal');
  const closeEnrollBtn = document.getElementById('enroll-modal-close-btn');
  const demoQuickActivateBtn = document.getElementById('demo-quick-activate-btn');
  let pendingPlanToActivate = 'trial';

  // Concierge Widget Elements
  const conciergeFab = document.getElementById('concierge-fab-btn');
  const conciergeDrawer = document.getElementById('concierge-drawer');
  const closeConciergeBtn = document.getElementById('close-concierge-btn');
  const conciergeChatBody = document.getElementById('concierge-chat-body');
  const conciergeInput = document.getElementById('concierge-input');
  const conciergeSendBtn = document.getElementById('concierge-send-btn');

  let allLuxuryProducts = [];
  let currentCategory = 'all';

  /**
   * 1. Check & Render Live Pro Status
   */
  async function checkProStatus() {
    if (!Auth.isAuthenticated()) {
      if (activeBanner) activeBanner.style.display = 'none';
      if (heroTrialBtn) {
        heroTrialBtn.innerHTML = '<span>⚡</span><span>Start 30-Day Free Trial (₹0 Today)</span>';
        heroTrialBtn.disabled = false;
      }
      return;
    }

    try {
      const res = await API.get('/auth/pro/status');
      if (res.success && res.data && res.data.isPro) {
        const info = res.data;
        if (activeBanner) {
          activeBanner.style.display = 'block';
          if (proDaysLeft) proDaysLeft.textContent = `⚡ ${info.daysRemaining} Days Remaining`;
          if (proCurrentPlan) {
            const planNames = {
              trial: '30-Day Free Trial',
              annual: 'Annual VIP Pro',
              monthly: 'Monthly Pro',
            };
            proCurrentPlan.textContent = planNames[info.proPlan] || 'Active Pro';
          }
          if (proExpiryText) {
            const expDate = info.proExpiresAt ? new Date(info.proExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Active';
            proExpiryText.innerHTML = `Your <strong>${info.proPlan === 'trial' ? '30-Day Free Trial' : 'SHOPORA PRO membership'}</strong> is active until <strong>${expDate}</strong>. You enjoy unlimited Free Lightning Express Delivery, White-Glove hand courier dispatch, and extra 5% member savings on every order.`;
          }
        }

        // Update enrollment buttons
        document.querySelectorAll('.activate-plan-btn').forEach((btn) => {
          if (btn.dataset.plan === info.proPlan) {
            btn.textContent = 'Current Plan (Active)';
            btn.disabled = true;
            btn.style.opacity = '0.7';
          } else {
            btn.textContent = 'Switch to this Plan';
            btn.disabled = false;
            btn.style.opacity = '1';
          }
        });

        if (heroTrialBtn) {
          heroTrialBtn.innerHTML = '<span>👑</span><span>VIP Member Privileges Active</span>';
          heroTrialBtn.disabled = true;
          heroTrialBtn.style.opacity = '0.9';
        }
      } else {
        if (activeBanner) activeBanner.style.display = 'none';
        if (heroTrialBtn) {
          heroTrialBtn.innerHTML = '<span>⚡</span><span>Start 30-Day Free Trial (₹0 Today)</span>';
          heroTrialBtn.disabled = false;
        }
      }
    } catch (err) {
      console.warn('Could not check Pro status:', err);
    }
  }

  /**
   * 2. Activate Pro Plan (Direct if authenticated, or opens VIP enrollment modal)
   */
  async function handleActivatePlan(plan = 'trial') {
    pendingPlanToActivate = plan;

    if (!Auth.isAuthenticated()) {
      if (enrollModal) {
        enrollModal.style.display = 'flex';
      } else {
        window.location.href = `login.html?redirect=pro.html`;
      }
      return;
    }

    try {
      Components.showToast('Activating your SHOPORA PRO membership...', 'info');
      const res = await API.post('/auth/pro/activate', { plan });
      if (res.success) {
        if (res.data) {
          Auth.setUser(res.data);
        }
        Components.showToast('🎉 Welcome to SHOPORA PRO! White-Glove delivery and member perks active.', 'success');
        await checkProStatus();
        await loadLuxuryProducts();

        window.dispatchEvent(new CustomEvent('user:updated', { detail: res.data }));
      } else {
        throw new Error(res.message || 'Failed to activate plan');
      }
    } catch (err) {
      Components.showToast(err.message || 'Could not activate Pro membership', 'error');
    }
  }

  // 1-Click Demo Quick Activate Button in Enrollment Modal
  if (demoQuickActivateBtn) {
    demoQuickActivateBtn.addEventListener('click', async () => {
      demoQuickActivateBtn.disabled = true;
      demoQuickActivateBtn.innerHTML = 'Logging in &amp; Activating...';

      try {
        // Fast authenticate with seeded customer account
        const loginRes = await API.post('/auth/login', {
          email: 'user@shopora.com',
          password: 'User@12345',
        });

        if (loginRes.token) {
          Auth.setSession(loginRes.token, loginRes.user);

          // Now activate the requested plan
          const actRes = await API.post('/auth/pro/activate', { plan: pendingPlanToActivate });
          if (actRes.data) {
            Auth.setUser(actRes.data);
          }

          if (enrollModal) enrollModal.style.display = 'none';
          Components.showToast('🎉 Demo Customer Authenticated & 30-Day Free Trial Active!', 'success');

          await checkProStatus();
          await loadLuxuryProducts();
          window.dispatchEvent(new CustomEvent('user:updated', { detail: actRes.data || loginRes.user }));
        } else {
          throw new Error(loginRes.message || 'Demo login failed');
        }
      } catch (err) {
        Components.showToast(err.message || 'Quick activation error', 'error');
        demoQuickActivateBtn.disabled = false;
        demoQuickActivateBtn.innerHTML = '⚡ 1-Click Instant Demo Activation';
      }
    });
  }

  // Close Enrollment Modal
  if (closeEnrollBtn) {
    closeEnrollBtn.addEventListener('click', () => {
      if (enrollModal) enrollModal.style.display = 'none';
    });
  }
  if (enrollModal) {
    enrollModal.addEventListener('click', (e) => {
      if (e.target === enrollModal) enrollModal.style.display = 'none';
    });
  }

  // Bind Plan Cards Buttons
  document.querySelectorAll('.activate-plan-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleActivatePlan(btn.dataset.plan));
  });

  if (heroTrialBtn) {
    heroTrialBtn.addEventListener('click', () => handleActivatePlan('trial'));
  }

  // Cancel Pro Membership
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      Components.confirmModal({
        title: 'Cancel Pro Membership?',
        message: 'Are you sure you want to cancel your SHOPORA PRO benefits? You will forfeit White-Glove hand delivery, Free Lightning Express shipping, and the 5% member checkout discount.',
        confirmText: 'Yes, Cancel Pro',
        cancelText: 'Keep My Privileges',
        onConfirm: async () => {
          try {
            const res = await API.post('/auth/pro/cancel');
            if (res.success) {
              const u = Auth.getUser() || {};
              u.isPro = false;
              u.proPlan = 'none';
              Auth.setUser(u);
              Components.showToast('Pro membership has been cancelled', 'info');
              await checkProStatus();
              await loadLuxuryProducts();
            }
          } catch (err) {
            Components.showToast(err.message || 'Failed to cancel', 'error');
          }
        },
      });
    });
  }

  /**
   * 3. Load & Filter Curated Amazon Luxury Products
   */
  async function loadLuxuryProducts() {
    if (!luxuryContainer) return;

    try {
      const res = await API.get('/products/luxury');
      allLuxuryProducts = res.data || [];

      renderFilteredLuxuryProducts();
    } catch (err) {
      luxuryContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #fca5a5;">
          Unable to load luxury pieces at this moment. Please try refreshing.
        </div>
      `;
    }
  }

  function renderFilteredLuxuryProducts() {
    if (!luxuryContainer) return;

    const user = Auth.getUser();
    const isPro = Boolean(user && user.isPro);

    let filtered = allLuxuryProducts;
    if (currentCategory !== 'all') {
      const catMap = {
        watches: ['watch', 'rolex', 'omega', 'cartier'],
        audiophile: ['audio', 'headphone', 'bang', 'leica', 'bose', 'sony', 'apple', 'sound', 'camera'],
        leather: ['leather', 'duffle', 'bottega', 'bag', 'travel', 'wallet'],
        parfumerie: ['parfumerie', 'francis', 'baccarat', 'perfume', 'beauty', 'fragrance'],
      };
      const keywords = catMap[currentCategory] || [];
      filtered = allLuxuryProducts.filter((p) => {
        const text = `${p.name} ${p.brand} ${p.subcategory || ''} ${p.categoryName || ''}`.toLowerCase();
        return keywords.some((k) => text.includes(k));
      });
    }

    if (filtered.length === 0) {
      luxuryContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: #94a3b8;">
          <div style="font-size: 2rem; margin-bottom: 8px;">💎</div>
          <p>No pieces found in this category. Showing all curated pieces.</p>
          <button class="btn-outline-gold" style="margin-top: 14px;" onclick="document.querySelector('.luxury-filter-btn[data-category=all]').click()">
            View All Pieces
          </button>
        </div>
      `;
      return;
    }

    luxuryContainer.innerHTML = filtered
      .map((p) => {
        const publicPrice = p.price;
        const proPrice = p.proExclusivePrice || Math.round(p.price * 0.95 * 100) / 100;
        const savings = Math.round((publicPrice - proPrice) * 100) / 100;

        return `
        <div class="luxury-product-card" data-id="${p._id}">
          <div class="luxury-img-wrapper">
            <img src="${p.image}" alt="${p.name}" loading="lazy" />
            <span class="luxury-brand-badge">${p.brand || 'MAISON'}</span>
            <span class="luxury-white-glove-badge">
              <span>🧤</span> White-Glove Hand Delivery
            </span>
          </div>

          <div class="luxury-card-body">
            <h3 class="luxury-card-title" title="${p.name}">${p.name}</h3>
            <p class="luxury-card-craft">
              ${p.offerText || p.description.slice(0, 85) + '...'}
            </p>

            <div class="luxury-price-box">
              <div>
                <div style="font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">
                  ${isPro ? 'Your PRO Price' : 'PRO Member Price'}
                </div>
                <div class="luxury-pro-price">
                  ₹${proPrice.toLocaleString()}
                  <span style="font-size: 0.72rem; color: #34d399; font-weight: 700;">(-5% Off)</span>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.7rem; color: #64748b; text-transform: uppercase;">Public Price</div>
                <div class="luxury-public-price">₹${publicPrice.toLocaleString()}</div>
                <div style="font-size: 0.72rem; color: #d4af37; font-weight: 700;">Save ₹${savings.toLocaleString()}</div>
              </div>
            </div>

            <div class="luxury-card-actions">
              <button type="button" class="btn-card-examine examine-product-btn" data-id="${p._id}">
                Examine Piece
              </button>
              <button type="button" class="btn-card-bag add-luxury-bag-btn" data-id="${p._id}">
                Add to Bag
              </button>
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    // Bind Examine buttons
    document.querySelectorAll('.examine-product-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const product = allLuxuryProducts.find((p) => p._id === id);
        if (product) openExamineModal(product);
      });
    });

    // Bind Add to Bag buttons
    document.querySelectorAll('.add-luxury-bag-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const product = allLuxuryProducts.find((p) => p._id === id);
        if (!product) return;

        btn.disabled = true;
        btn.textContent = 'Securing...';

        try {
          if (window.Cart) {
            await Cart.addItem({
              _id: product._id,
              name: product.name,
              price: product.price,
              image: product.image,
              brand: product.brand,
              quantity: 1,
            });
            Components.showToast(`✨ "${product.name}" added to bag with White-Glove dispatch!`, 'success');
          }
        } catch (e) {
          Components.showToast('Could not add to bag', 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Add to Bag';
        }
      });
    });
  }

  // Filter Buttons
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      renderFilteredLuxuryProducts();
    });
  });

  /**
   * 4. Examine Piece (Quick View Modal)
   */
  function openExamineModal(product) {
    if (!examineModal || !examineContent) return;

    const user = Auth.getUser();
    const isPro = Boolean(user && user.isPro);
    const proPrice = product.proExclusivePrice || Math.round(product.price * 0.95 * 100) / 100;
    const savings = Math.round((product.price - proPrice) * 100) / 100;

    const specsHtml = (product.specifications || [])
      .map(
        (s) => `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.85rem;">
        <span style="color: #94a3b8;">${s.key}</span>
        <strong style="color: #fff; text-align: right; max-width: 60%;">${s.value}</strong>
      </div>
    `
      )
      .join('');

    examineContent.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; padding: 36px;">
        <div>
          <div style="border-radius: 16px; overflow: hidden; border: 1px solid rgba(212,175,55,0.3); background: #000; height: 380px;">
            <img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
          <div style="margin-top: 14px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 10px 14px; border-radius: 10px; font-size: 0.78rem;">
            <span style="color: #d4af37; font-weight: 700;">✓ Holographic Tamper-Proof Seal</span>
            <span style="color: #94a3b8;">SKU: ${product.sku || 'LX-AUTHENTIC'}</span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column;">
          <div style="font-family: 'Cinzel', serif; font-size: 0.8rem; color: #d4af37; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 6px;">
            ${product.brand || 'HAUTE HORLOGERIE'}
          </div>
          <h2 style="font-family: 'Playfair Display', serif; font-size: 1.6rem; color: #ffffff; line-height: 1.3; margin-bottom: 14px;">
            ${product.name}
          </h2>

          <div style="background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.25); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span style="font-size: 0.8rem; color: #fef08a; text-transform: uppercase; font-weight: 700;">PRO Member Price</span>
              <span style="font-size: 1.5rem; font-weight: 800; color: #fef08a;">₹${proPrice.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 0.8rem;">
              <span style="color: #94a3b8;">Public Price: <span style="text-decoration: line-through;">₹${product.price.toLocaleString()}</span></span>
              <span style="color: #34d399; font-weight: 700;">You Save ₹${savings.toLocaleString()}</span>
            </div>
          </div>

          <p style="font-size: 0.9rem; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
            ${product.description}
          </p>

          <div style="margin-bottom: 24px;">
            <div style="font-family: 'Cinzel', serif; font-size: 0.8rem; color: #d4af37; margin-bottom: 8px;">
              Master Craftsmanship &amp; Provenance
            </div>
            ${specsHtml || '<p style="color: #94a3b8; font-size: 0.85rem;">Includes official brand certification &amp; warranty.</p>'}
          </div>

          <div style="margin-top: auto; display: flex; gap: 12px;">
            <button type="button" class="btn-gold-luxury" id="modal-add-to-bag-btn" style="flex: 1; justify-content: center; padding: 13px;">
              Order with White-Glove Delivery
            </button>
          </div>
        </div>
      </div>
    `;

    examineModal.style.display = 'flex';

    // Bind Add in Modal
    const modalAddBtn = document.getElementById('modal-add-to-bag-btn');
    if (modalAddBtn) {
      modalAddBtn.addEventListener('click', async () => {
        modalAddBtn.disabled = true;
        modalAddBtn.textContent = 'Securing in Bag...';
        try {
          if (window.Cart) {
            await Cart.addItem({
              _id: product._id,
              name: product.name,
              price: product.price,
              image: product.image,
              brand: product.brand,
              quantity: 1,
            });
            Components.showToast(`✨ "${product.name}" added to bag with White-Glove dispatch!`, 'success');
            examineModal.style.display = 'none';
          }
        } catch (err) {
          Components.showToast('Could not add to bag', 'error');
        } finally {
          modalAddBtn.disabled = false;
        }
      });
    }
  }

  if (closeExamineBtn) {
    closeExamineBtn.addEventListener('click', () => {
      if (examineModal) examineModal.style.display = 'none';
    });
  }
  if (examineModal) {
    examineModal.addEventListener('click', (e) => {
      if (e.target === examineModal) examineModal.style.display = 'none';
    });
  }

  /**
   * 5. Interactive VIP Concierge Live Chat Simulation
   */
  if (conciergeFab) {
    conciergeFab.addEventListener('click', () => {
      if (conciergeDrawer) {
        conciergeDrawer.style.display = conciergeDrawer.style.display === 'flex' ? 'none' : 'flex';
      }
    });
  }
  if (closeConciergeBtn) {
    closeConciergeBtn.addEventListener('click', () => {
      if (conciergeDrawer) conciergeDrawer.style.display = 'none';
    });
  }

  function appendChatBubble(text, sender = 'assistant') {
    if (!conciergeChatBody) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.innerHTML = text;
    conciergeChatBody.appendChild(bubble);
    conciergeChatBody.scrollTop = conciergeChatBody.scrollHeight;
  }

  function handleConciergeMessage(userText) {
    if (!userText || !userText.trim()) return;
    const text = userText.trim();
    appendChatBubble(text, 'user');

    const lower = text.toLowerCase();
    let reply = '';

    if (lower.includes('white') || lower.includes('glove') || lower.includes('delivery')) {
      reply = '🧤 <strong>White-Glove Delivery:</strong> Every piece is hand-delivered by our uniformed luxury courier in a matte obsidian presentation box with velvet inlay and security PIN verification. Included 100% free for PRO members!';
    } else if (lower.includes('trial') || lower.includes('30') || lower.includes('free') || lower.includes('activate')) {
      reply = '⚡ <strong>30-Day Free Trial:</strong> You can activate your 30-Day Free Trial in 1 click! Click the gold "Start 30-Day Free Trial" button above to unlock instant 5% member discounts and zero delivery fees.';
    } else if (lower.includes('rolex') || lower.includes('omega') || lower.includes('cartier') || lower.includes('watch')) {
      reply = '⌚ <strong>Haute Horlogerie:</strong> All timepieces in our Luxury Vault (Rolex Submariner, Omega Seamaster, Cartier Santos) are 100% brand-new, accompanied by manufacturer warranty dossiers and physical guarantee cards.';
    } else if (lower.includes('authentic') || lower.includes('guarantee') || lower.includes('real')) {
      reply = '📜 <strong>Authenticity Certification:</strong> Every luxury item undergoes multi-point inspection by certified horologists and gemologists, sealed with a tamper-proof holographic dossier.';
    } else {
      reply = `Thank you for inquiring about "${text}". As a SHOPORA PRO member, your dedicated concierge can arrange private viewings, reserved serial numbers, and custom gift presentation. Would you like me to reserve a piece for you today?`;
    }

    setTimeout(() => {
      appendChatBubble(reply, 'assistant');
    }, 600);
  }

  if (conciergeSendBtn && conciergeInput) {
    conciergeSendBtn.addEventListener('click', () => {
      const val = conciergeInput.value;
      conciergeInput.value = '';
      handleConciergeMessage(val);
    });

    conciergeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = conciergeInput.value;
        conciergeInput.value = '';
        handleConciergeMessage(val);
      }
    });
  }

  // Quick Chips in Concierge
  document.querySelectorAll('.quick-chip-btn').forEach((chip) => {
    chip.addEventListener('click', () => {
      handleConciergeMessage(chip.dataset.query);
    });
  });

  // Initial Boot
  await checkProStatus();
  await loadLuxuryProducts();
});
