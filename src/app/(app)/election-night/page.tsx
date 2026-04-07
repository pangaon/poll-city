import ElectionNightClient from "./election-night-client";

export const metadata = {
  title: "Election Night — Poll City",
  description: "Live election night results dashboard with real-time vote tracking",
};

export default function ElectionNightPage() {
  return <ElectionNightClient />;
}
