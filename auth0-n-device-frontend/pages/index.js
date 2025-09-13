// pages/index.js
import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import { useAuth0 } from "@auth0/auth0-react";
import Link from "next/link";

export default function Home() {
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  return (
    <Box minH="100vh" bg="gray.50" p={8}>
      <VStack
        maxW="600px"
        mx="auto"
        spacing={6}
        bg="white"
        p={10}
        rounded="lg"
        shadow="md"
      >
        <Heading size="lg">N-Device Login Demo</Heading>
        <Text>
          Login with Auth0. This app enforces at most N concurrent devices.
        </Text>

        {!isAuthenticated ? (
          <Button colorScheme="teal" onClick={() => loginWithRedirect()}>
            Login with Auth0
          </Button>
        ) : (
          <Link href="/callback" passHref>
            <Button colorScheme="blue">Continue</Button>
          </Link>
        )}
      </VStack>
    </Box>
  );
}
