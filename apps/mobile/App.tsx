import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type User = {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
};

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;

  useEffect(() => {
    if (!baseUrl) {
      console.log("Missing EXPO_PUBLIC_API_URL. Check apps/mobile/.env");
      return;
    }

    fetch(`${baseUrl}/users`)
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch((err) => console.log("Fetch error:", err));
  }, [baseUrl]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Users from API</Text>
      <Text style={styles.subtitle}>{baseUrl ?? "No API URL set"}</Text>

      {users.length === 0 ? (
        <Text>No users found (or API not reachable).</Text>
      ) : (
        users.map((u) => (
          <Text key={u.id}>
            {(u.name ?? "(no name)")} — {u.email}
          </Text>
        ))
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 22, marginBottom: 8 },
  subtitle: { fontSize: 12, marginBottom: 16 },
});
