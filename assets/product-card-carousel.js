if (!customElements.get('product-card-carousel')) {
  customElements.define(
    'product-card-carousel',
    class ProductCardCarousel extends HTMLElement {
      constructor() {
        super();
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
      }

      connectedCallback() {
        this.addEventListener('click', this.handleClick.bind(this));

        this.querySelectorAll('.card-product-carousel__swatch input').forEach((input) => {
          input.addEventListener('change', () => {
            this.handleSwatchClick(input.closest('.card-product-carousel__swatch'));
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

      handleSwatchClick(swatch) {
        this.dataset.variantId = swatch.dataset.variantId;

        const image = this.querySelector('.card-product-carousel__image');
        if (image && swatch.dataset.variantImage) {
          image.src = swatch.dataset.variantImage;
          image.srcset = '';
        }

        const title = this.querySelector('.card-product-carousel__title');
        if (title && swatch.dataset.variantTitle) {
          title.textContent = swatch.dataset.variantTitle;
        }

        const price = this.querySelector('.card-product-carousel__price');
        if (price && swatch.dataset.variantPrice) {
          price.textContent = swatch.dataset.variantPrice;
        }
      }

      addToCart() {
        const variantId = this.dataset.variantId;
        if (!variantId || this.dataset.unavailable === 'true') return;

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
          .catch((error) => console.error('Cart fetch error:', error));
      }
    }
  );
}
