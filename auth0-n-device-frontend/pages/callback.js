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

// --- Helper to detect device/browser ---
function getDeviceName() {
  const ua = navigator.userAgent;
  let device = "Web Browser";

  if (/Windows NT/i.test(ua)) device = "Windows PC";
  else if (/Macintosh/i.test(ua)) device = "Mac";
  else if (/Linux/i.test(ua)) device = "Linux PC";
  else if (/iPhone/i.test(ua)) device = "iPhone";
  else if (/iPad/i.test(ua)) device = "iPad";
  else if (/Android/i.test(ua)) device = "Android Device";

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
  const { isLoading, isAuthenticated, getAccessTokenSilently, logout } = useAuth0();
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

    (async () => {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: "https://fastapi-backend" },
        });

        const DEVICE_NAME = getDeviceName();

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

        if (resp.data.overquota) {
          setOverquotaData(resp.data);
        } else {
          localStorage.setItem("session_id", resp.data.session_id);
          toast({ title: "Session registered", status: "success" });
          router.replace("/private");
        }
      } catch (err) {
        console.error("Session register error", err);
        logout({ returnTo: window.location.origin });
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoading, isAuthenticated]);

  // --- Loading State ---
  if (loading || isLoading) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="gray.50"
        p={6}
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="teal.500" />
          <Heading size="lg" color="teal.700">
            Lawandverdict
          </Heading>
          <Text fontSize="md" color="gray.600">
            Finalizing sign in... please wait
          </Text>
        </VStack>
      </Box>
    );
  }

  // --- Over Quota (too many devices) ---
  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={6}>
      <VStack
        maxW="500px"
        w="full"
        spacing={6}
        p={8}
        bg="white"
        shadow="xl"
        rounded="xl"
        textAlign="center"
      >
        <Heading size="lg" color="teal.700">
          Session Registration
        </Heading>
        {overquotaData ? (
          <OverQuotaModal
            data={overquotaData}
            onActivated={() => router.replace("/private")}
          />
        ) : (
          <Text fontSize="md" color="gray.600">
            Redirecting to your secure dashboard...
          </Text>
        )}
      </VStack>
    </Box>
  );
}
