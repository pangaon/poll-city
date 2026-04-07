import CommandCenterClient from "./command-center-client";

export const metadata = {
  title: "Command Center — Poll City",
  description: "Election day GOTV command operations dashboard",
};

export default function CommandCenterPage() {
  return <CommandCenterClient />;
}
