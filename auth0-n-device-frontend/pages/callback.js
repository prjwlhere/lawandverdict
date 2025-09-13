// pages/callback.js
import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import axios from "axios";
import { useRouter } from "next/router";
import {
  Box,
  Heading,
  Text,
  Spinner,
  VStack,
  useToast,
} from "@chakra-ui/react";
import OverQuotaModal from "../components/OverQuotaModal";

const API = "https://lawandverdict.onrender.com";

// Helper to get a friendly device + browser name
function getDeviceName() {
  const ua = navigator.userAgent;
  let device = "Web Browser";

  if (/Windows NT/i.test(ua)) device = "Windows PC";
  else if (/Macintosh/i.test(ua)) device = "Mac";
  else if (/Linux/i.test(ua)) device = "Linux PC";
  else if (/iPhone/i.test(ua)) device = "iPhone";
  else if (/iPad/i.test(ua)) device = "iPad";
  else if (/Android/i.test(ua)) device = "Android Device";

  // Detect browser name and version
  let browser = "Unknown Browser";
  const match =
    ua.match(/(firefox|msie|chrome|safari|edg|opera|opr|trident(?=\/))\/?\s*(\d+)/i) || [];
  if (match.length >= 3) {
    browser = match[1] + " " + match[2];
    if (/opr/i.test(browser)) browser = browser.replace("opr", "Opera");
    if (/edg/i.test(browser)) browser = browser.replace("edg", "Edge");
  }

  return `${browser} on ${device}`;
}

export default function CallbackPage() {
  const { isLoading, isAuthenticated, getAccessTokenSilently, logout } =
    useAuth0();
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [overquotaData, setOverquotaData] = useState(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      console.log("User not authenticated yet");
      return;
    }

    console.log("User authenticated, registering session now...");

    (async () => {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: "https://fastapi-backend" },
        });
        console.log("Got token", token);
        localStorage.setItem("debug_token", token);

        const DEVICE_NAME = getDeviceName(); // dynamic device/browser name
        console.log("Registering device:", DEVICE_NAME);

        const resp = await axios.post(
          `${API}/sessions/register`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "X-Device-Name": DEVICE_NAME,
            },
          }
        );

        console.log("API response", resp.data);

        if (resp.data.overquota) {
          setOverquotaData(resp.data);
        } else {
          localStorage.setItem("session_id", resp.data.session_id);
          toast({ title: "Session registered", status: "success" });
          router.replace("/private");
        }
      } catch (err) {
        console.error("register error", err);
        logout({ returnTo: window.location.origin });
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoading, isAuthenticated]);

  if (loading || isLoading) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Heading>Finalizing sign in...</Heading>
          <Text>Registering this device...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={8}>
      <Heading>Session registration</Heading>
      {overquotaData ? (
        <OverQuotaModal
          data={overquotaData}
          onActivated={() => router.replace("/private")}
        />
      ) : (
        <Text>Redirecting...</Text>
      )}
    </Box>
  );
}
