  import { Resend } from 'resend';

  interface EmailPayload {
    email: string;
    grandTotal: number;
    address: string; 
    phone: string;
}

const resend = new Resend(`${process.env.RESEND_KEY}`);

export const sendEmail = async ({ email, grandTotal, address, phone }: EmailPayload) => {

    const htmlContent = `h1>Your order was successful!</h1>
    <p>Thank you for your purchase. Here are your order details:</p>
    <ul>
        <li><strong>Grand Total:</strong> ${grandTotal.toFixed(2)}</li>
        <li><strong>Shipping Address:</strong> ${address}</li>
        <li><strong>Contact Phone:</strong> ${phone}</li>
    </ul>
    <p>We will notify you once your order is shipped.</p>
    `;

    const { data, error } = await resend.emails.send({
        from: `${process.env.EMAIL_FROM}`,
        to: [email],
        subject: "Successful Order",
        html: htmlContent, 
    });
 
    if(error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email");
    }
  
    return data;
};