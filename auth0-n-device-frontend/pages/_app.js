// pages/_app.js
import { ChakraProvider } from "@chakra-ui/react";
import { Auth0Provider } from "@auth0/auth0-react";

function MyApp({ Component, pageProps }) {
  const domain = "dev-8whvepj1827d3ilh.us.auth0.com";
  const clientId = "fDLF0doVbHHQQXl3BYQ0qfo4QkZSy5we";
  const audience = "https://fastapi-backend";
  const redirectUri =
    typeof window !== "undefined" ? window.location.origin + "/callback" : "";

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        audience: audience,
        scope: "openid profile email",
      }}
    >
      <ChakraProvider>
        <Component {...pageProps} />
      </ChakraProvider>
    </Auth0Provider>
  );
}

export default MyApp;
