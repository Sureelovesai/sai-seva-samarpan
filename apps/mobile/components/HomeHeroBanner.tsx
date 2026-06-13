import { Image, type ImageLoadEventData } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  HOME_HERO_BANNER_URLS,
  HOME_HERO_LOCAL,
  HOME_HERO_PORTRAIT_ASPECT,
  SITE_LOGO_LOCAL,
  SITE_LOGO_URL,
} from "@/lib/homeHero";

/**
 * Mobile portrait home header + hero — matches mobile web:
 * white site header with Seva Samarpan logo, then full portrait seva wheel art.
 */
export function HomeHeroBanner() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [logoIndex, setLogoIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(HOME_HERO_PORTRAIT_ASPECT);

  const remoteHero = heroIndex < HOME_HERO_BANNER_URLS.length ? HOME_HERO_BANNER_URLS[heroIndex] : null;
  const heroSource = remoteHero ? { uri: remoteHero } : HOME_HERO_LOCAL;
  const logoSource = logoIndex === 0 ? { uri: SITE_LOGO_URL } : SITE_LOGO_LOCAL;

  const onHeroLoad = (e: ImageLoadEventData) => {
    const w = e.source.width;
    const h = e.source.height;
    if (w > 0 && h > 0) setAspectRatio(w / h);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Image
          source={logoSource}
          style={styles.logo}
          contentFit="contain"
          contentPosition="left"
          accessibilityLabel="Sri Sathya Sai Seva Samarpan"
          onError={() => {
            if (logoIndex === 0) setLogoIndex(1);
          }}
        />
      </View>

      <Image
        source={heroSource}
        style={[styles.hero, { aspectRatio }]}
        contentFit="contain"
        contentPosition="top"
        transition={200}
        onLoad={onHeroLoad}
        onError={() => {
          if (heroIndex < HOME_HERO_BANNER_URLS.length) setHeroIndex((i) => i + 1);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    marginHorizontal: -16,
    backgroundColor: "#eef3ef",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logo: {
    height: 72,
    width: "100%",
    maxWidth: 220,
  },
  hero: {
    width: "100%",
  },
});
