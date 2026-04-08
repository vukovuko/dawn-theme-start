if (!customElements.get('product-carousel-swiper')) {
  customElements.define(
    'product-carousel-swiper',
    class ProductCarouselSwiper extends HTMLElement {
      connectedCallback() {
        window.initSwiper().then(({ default: Swiper, Navigation, Pagination }) => {
          const columnsDesktop = parseInt(this.dataset.columnsDesktop) || 4;
          const columnsMobile = parseFloat(this.dataset.columnsMobile) || 1.5;

          this.swiper = new Swiper(this.querySelector('.swiper'), {
            modules: [Navigation, Pagination],
            slidesPerView: columnsMobile,
            spaceBetween: 20,
            breakpoints: {
              750: {
                slidesPerView: 2,
                spaceBetween: 16,
              },
              950: {
                slidesPerView: 3,
                spaceBetween: 16,
              },
              1300: {
                slidesPerView: columnsDesktop,
                spaceBetween: 16,
              },
            },
          });
        });
      }
    }
  );
}

if (!customElements.get('product-card-carousel')) {
  customElements.define(
    'product-card-carousel',
    class ProductCardCarousel extends HTMLElement {
      constructor() {
        super();
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.data = null;
      }

      connectedCallback() {
        this.addEventListener('click', this.handleClick.bind(this));
        this.bindSwatchListeners();
      }

      bindSwatchListeners() {
        this.querySelectorAll('.card-product-carousel__swatch input').forEach((input) => {
          input.addEventListener('change', () => {
            this.handleSwatchChange(input.closest('.card-product-carousel__swatch'));
          });
          input.addEventListener('click', (event) => {
            event.stopPropagation();
          });
        });

        this.querySelectorAll('.card-product-carousel__swatch label').forEach((label) => {
          label.addEventListener('click', (event) => {
            event.stopPropagation();
          });
        });
      }

      handleClick(event) {
        event.preventDefault();
        this.addToCart();
      }

      async handleSwatchChange(swatch) {
        const variantId = swatch.dataset.variantId;

        try {
          await this.loadCardData();
          this.updateCard(variantId);
        } catch (error) {
          console.warn('Section Rendering API fetch failed:', error);
        }
      }

      async loadCardData() {
        if (this.data) return this.data;

        const productUrl = this.dataset.productUrl;
        const response = await fetch(`${productUrl}?section_id=product-card-content`);
        const text = await response.text();

        this.data = new DOMParser().parseFromString(text, 'text/html');
        return this.data;
      }

      updateCard(variantId) {
        const variantCard = this.data.querySelector(`[data-variant-card="${variantId}"]`);
        if (!variantCard) return;

        this.dataset.variantId = variantId;
        this.innerHTML = variantCard.innerHTML;
        this.bindSwatchListeners();
      }

      addToCart() {
        const variantId = this.dataset.variantId;
        if (!variantId || this.dataset.unavailable === 'true') return;

        this.style.cursor = 'wait';

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData();
        formData.append('id', variantId);
        formData.append('quantity', 1);

        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(this);
        }

        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              console.error('Error adding to cart:', response);
              return;
            }

            console.log('Successfully added to cart:', response);

            if (this.cart) {
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-card-carousel',
                productVariantId: formData.get('id'),
                cartData: response,
              });
              this.cart.renderContents(response);
            }
          })
          .catch((error) => console.error('Cart fetch error:', error))
          .finally(() => { this.style.cursor = 'pointer'; });
      }
    }
  );
}
