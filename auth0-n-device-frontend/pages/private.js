// pages/private.js
import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import axios from "axios";
import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  Divider,
  Flex,
} from "@chakra-ui/react";
import { useRouter } from "next/router";

const API = "https://lawandverdict.onrender.com";

export default function PrivatePage() {
  const { getAccessTokenSilently, logout } = useAuth0();
  const [userInfo, setUserInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const router = useRouter();

  async function fetchMe() {
    const session_id = localStorage.getItem("session_id");
    if (!session_id) {
      setErrorMsg("No active session found. Please log in again.");
      return;
    }

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: "https://fastapi-backend" },
      });
      const resp = await axios.get(`${API}/user/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Session-ID": session_id,
        },
      });
      setUserInfo(resp.data);
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message;
      if (detail.toLowerCase().includes("revoked")) {
        localStorage.removeItem("session_id");
        setErrorMsg("Your session was revoked. Please log in again.");
      } else {
        setErrorMsg(detail);
      }
    }
  }

  useEffect(() => {
    fetchMe();
  }, []);

  async function handleLogout() {
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: "https://fastapi-backend" },
      });

      const session_id = localStorage.getItem("session_id");

      if (session_id) {
        await axios.post(
          `${API}/sessions/logout`,
          { session_id },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "X-Session-ID": session_id,
              "Content-Type": "application/json",
            },
          }
        );
        localStorage.removeItem("session_id");
      }

      logout({ returnTo: window.location.origin });
    } catch (err) {
      console.error("Logout error", err);
      localStorage.removeItem("session_id");
      logout({ returnTo: window.location.origin });
    }
  }

  // --- Error State ---
  if (errorMsg) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
        <VStack spacing={6} p={10} bg="white" rounded="xl" shadow="lg">
          <Alert status="warning" rounded="md">
            <AlertIcon />
            {errorMsg}
          </Alert>
          <Button colorScheme="teal" onClick={() => router.push("/")}>
            Back to Login
          </Button>
        </VStack>
      </Box>
    );
  }

  // --- Loading State ---
  if (!userInfo) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text fontSize="lg" color="gray.600">
          Loading your profile...
        </Text>
      </Box>
    );
  }

  // --- Main Profile ---
  return (
    <Box minH="100vh" bg="gray.50" p={8}>
      <VStack
        maxW="600px"
        mx="auto"
        spacing={6}
        align="stretch"
        bg="white"
        p={10}
        rounded="2xl"
        shadow="xl"
      >
        {/* Header */}
        <Box textAlign="center">
          <Heading size="lg" color="teal.700">
            Welcome to Lawandverdict
          </Heading>
          <Text fontSize="sm" color="gray.500">
            Jaipur, Rajasthan · Secure Legal AI Search
          </Text>
        </Box>

        <Divider />

        {/* User Info */}
        <VStack align="start" spacing={3}>
          <Text>
            <strong>Full name:</strong> {userInfo.name || "Not provided"}
          </Text>
          <Text>
            <strong>Phone:</strong> {userInfo.phone_number || "Not provided"}
          </Text>
        </VStack>

        <Divider />

        {/* Actions */}
        <Flex justify="space-between" gap={4}>
          <Button colorScheme="red" flex="1" onClick={handleLogout}>
            Log out
          </Button>
          <Button flex="1" variant="outline" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </Flex>
      </VStack>
    </Box>
  );
}
