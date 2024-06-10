const HTML_TEMPLATE = (text, link) => {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Omoku Preneurs Ltd</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
      </head>
      <body style="font-family: 'Poppins', Arial, sans-serif">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding: 20px;">
              <table class="content" width="600" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #cccccc;">
                  <!-- Header -->
                  <tr>
                      <td class="header" style="background-color: #66BB6A; padding: 40px; text-align: center; color: white; font-size: 24px;"><img source="../assets/icons/logo.jpg"; width="20%"></img>
                      Omoku Preneurs Ltd
                      </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                      <td class="body" style="padding: 40px; text-align: left; font-size: 16px; line-height: 1.6;">
                      ${text}
                      </td>
                  </tr>
                  <!-- Call to action Button -->
                  <tr>
                      <td style="padding: 0px 40px 0px 40px; text-align: center;">
                          <!-- CTA Button -->
                          <table cellspacing="0" cellpadding="0" style="margin: auto;">
                              <tr>
                                  <td align="center" style="background-color: #66BB6A; padding: 10px 20px; border-radius: 5px;">
                                      <a href=${link} target="_blank" style="color: #ffffff; text-decoration: none; font-weight: bold;">Visit Us</a>
                                  </td>
                              </tr>
                          </table>
                      </td>
                  </tr><br>
                  <tr>
                      <td class="body" style="padding: 40px; text-align: left; font-size: 16px; line-height: 1.6;">
                          - Contact Us @<br>
                          support@omokupreneurs.ng
                      </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                      <td class="footer" style="background-color: #333333; padding: 40px; text-align: center; color: white; font-size: 14px;">
                      Copyright &copy; 2023 | Omoku Preneurs Ltd
                      </td>
                  </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
}

module.exports = HTML_TEMPLATE;