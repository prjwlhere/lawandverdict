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
      setErrorMsg("No session ID found. Please login again.");
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
        setErrorMsg(
          "You were logged out from this device. Please sign in again."
        );
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
      // include X-Session-ID header so backend dependency can validate session ownership
      await axios.post(
        `${API}/sessions/logout`,
        { session_id }, // body
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Session-ID": session_id, // <- important
            "Content-Type": "application/json",
          },
        }
      );
      localStorage.removeItem("session_id");
    }

    // finally log out from Auth0
    logout({ returnTo: window.location.origin });
  } catch (err) {
    console.error("Logout error", err);
    // best-effort: clear local session and redirect to login
    localStorage.removeItem("session_id");
    // optionally show user a friendly message before redirecting
    logout({ returnTo: window.location.origin });
  }
}

  if (errorMsg) {
    return (
      <Box p={8}>
        <VStack spacing={4}>
          <Alert status="warning">
            <AlertIcon />
            {errorMsg}
          </Alert>
          <HStack>
            <Button colorScheme="teal" onClick={() => router.push("/")}>
              Sign in again
            </Button>
          </HStack>
        </VStack>
      </Box>
    );
  }

  if (!userInfo) {
    return (
      <Box p={8}>
        <Text>Loading profile...</Text>
      </Box>
    );
  }

  return (
    <Box p={8}>
      <VStack spacing={6} align="start">
        <Heading>Private area</Heading>
        <Text>
          <strong>Full name:</strong> {userInfo.name || "—"}
        </Text>
        <Text>
          <strong>Phone:</strong> {userInfo.phone_number || "—"}
        </Text>

        <HStack spacing={4}>
          <Button colorScheme="red" onClick={handleLogout}>
            Log out
          </Button>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </HStack>
      </VStack>
    </Box>
  );
}
