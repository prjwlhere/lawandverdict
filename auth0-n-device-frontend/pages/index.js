// pages/index.js
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  Divider,
  Icon,
} from "@chakra-ui/react";
import { useAuth0 } from "@auth0/auth0-react";
import Link from "next/link";

export default function Home() {
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  return (
    <Box minH="100vh" bgGradient="linear(to-br, teal.50, gray.100)" p={8}>
      {/* Header / Brand */}
      <Box textAlign="center" mb={10}>
        <Heading size="2xl" color="teal.700" letterSpacing="tight">
          Lawandverdict
        </Heading>
        <Text fontSize="md" color="gray.600" mt={2}>
          Jaipur, Rajasthan · The most user-friendly AI search engine for lawyers
        </Text>
      </Box>

      {/* Main Card */}
      <VStack
        maxW="600px"
        mx="auto"
        spacing={6}
        bg="white"
        p={10}
        rounded="2xl"
        shadow="xl"
      >
        <Heading size="lg" color="teal.700">
          Secure Login
        </Heading>
        <Text fontSize="md" color="gray.600" textAlign="center">
          Access your personalized <b>legal AI search dashboard</b>.{" "}
          This app ensures secure access with a limit of <b>N concurrent devices</b>.
        </Text>

        <Divider />

        {!isAuthenticated ? (
          <Button
            colorScheme="teal"
            size="lg"
            w="full"
            leftIcon={<Icon boxSize={5}>🔑</Icon>}
            onClick={() => loginWithRedirect()}
          >
            Login with Auth0
          </Button>
        ) : (
          <Link href="/callback" passHref>
            <Button
              as="a"
              colorScheme="blue"
              size="lg"
              w="full"
              rightIcon={<Icon boxSize={5}>➡️</Icon>}
            >
              Continue
            </Button>
          </Link>
        )}
      </VStack>

      {/* Footer */}
      <Box textAlign="center" mt={12} color="gray.500" fontSize="sm">
        © {new Date().getFullYear()} Lawandverdict · Jaipur, Rajasthan · All Rights Reserved
      </Box>
    </Box>
  );
}
