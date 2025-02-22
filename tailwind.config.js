// @type {import('tailwindcss').Config}
import withMT from "@material-tailwind/react/utils/withMT";

export default withMT({
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        light: {
          background: "#D0D0D0",
          text: "#F5F5F5",
          choiceBg: "#C0C0C0",
          choiceBorder: "#989595",
          footer: "#ABABAB",
          filepicker: "#D9D9D9",
          qrBg: "#C5E9ED"
        },
        dark: {
          background: "#2B2B2B",
          footer: "#000000",
          filepicker: "#989898",
          qrBg: "#9D9D9D"
        },
        mobile: {
          light: {
            background: "#F9F9F9",
          },
          dark: {
            background: "#1F1A1A",
          }
        }
      }
    },
  },
  plugins: [],
});

