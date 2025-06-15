export const memberships = [
    {
      label: 'Adult & Teens',
      info: [
         { price: 13999, description: "1 Month", cancel: 'Cancel Any Time', duration: 1, subscription: true, billed: 'per month', stripe: true, adult: true,  paymentLink: 'https://buy.stripe.com/14AcMXdvacEl3Qw9dXds40u'},
        { price: 79999, description: "6 Months", duration: 6, subscription: false, billed: 'one time payment', stripe: true, adult: true, paymentLink: 'https://buy.stripe.com/14AdR1cr6eMt2Msbm5ds40v', cash:true },
        { price: 149999 , description: "1 Year", duration: 12, subscription: false, billed: 'one time payment', stripe: true, adult: true, paymentLink: 'https://buy.stripe.com/bJebIT4YE6fX1IofClds40w', cash:true },
      ]
    },
    {
      label: 'Kids (5-12)',
      info: [
        { price: 11999, description: "1 Month", cancel: 'Cancel Any Time', duration: 1, subscription: true, billed: 'per month', stripe: true, adult: false, kids: true , paymentLink: 'https://buy.stripe.com/eVadUz13zg3h0V228A'},
        { price: 69999, description: "6 Months", duration: 6, subscription: false, billed: 'one time payment', stripe: true, adult: false, kids: true , paymentLink: 'https://buy.stripe.com/6oEcQv3bH8AP0V2aF1', cash:true },
        { price: 129999, description: "1 Year", duration: 12, subscription: false, billed: 'one time payment', stripe: true, adult: false, kids: true , paymentLink: 'https://buy.stripe.com/4gw5o3h2x4kzbzG5kG', cash:true }
      ]
    }   
  ];
