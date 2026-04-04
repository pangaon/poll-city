"use client";

import { useEffect, useState } from "react";

export default function VolunteersGroupsClient({ campaignId }: { campaignId: string }) {
  const [groups, setGroups] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetWard, setTargetWard] = useState("");
  const [leaderProfileId, setLeaderProfileId] = useState("");

  async function load() {
    const [groupsRes, volunteersRes] = await Promise.all([
      fetch(`/api/volunteers/groups?campaignId=${campaignId}`),
      fetch(`/api/volunteers?campaignId=${campaignId}&pageSize=200`),
    ]);
    const groupsData = await groupsRes.json();
    const volunteersData = await volunteersRes.json();
    setGroups(groupsData.data ?? []);
    setProfiles(volunteersData.data ?? []);
  }

  useEffect(() => {
    load();
  }, [campaignId]);

  async function createGroup() {
    if (!name.trim()) return;
    await fetch("/api/volunteers/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, name, description, targetWard, leaderProfileId: leaderProfileId || undefined }),
    });
    setName("");
    setDescription("");
    setTargetWard("");
    setLeaderProfileId("");
    load();
  }

  async function addMember(groupId: string, volunteerProfileId: string) {
    if (!volunteerProfileId) return;
    await fetch(`/api/volunteers/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volunteerProfileIds: [volunteerProfileId] }),
    });
    load();
  }

  async function messageGroup(groupId: string) {
    const message = window.prompt("Message to this group");
    if (!message) return;
    await fetch(`/api/volunteers/groups/${groupId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Volunteer Group Update", message }),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Volunteer Groups</h1>
        <p className="text-sm text-gray-500">Create and manage ward teams with designated volunteer leaders.</p>
      </div>

      <section className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Create Group</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="border rounded-lg px-3 py-2" placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="border rounded-lg px-3 py-2" placeholder="Target ward" value={targetWard} onChange={(e) => setTargetWard(e.target.value)} />
          <input className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <select className="border rounded-lg px-3 py-2 md:col-span-2" value={leaderProfileId} onChange={(e) => setLeaderProfileId(e.target.value)}>
            <option value="">Select leader</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{(p.user?.name ?? `${p.contact?.firstName ?? ""} ${p.contact?.lastName ?? ""}`.trim()) || p.id}</option>
            ))}
          </select>
        </div>
        <button onClick={createGroup} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Create Group</button>
      </section>

      <section className="space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="bg-white border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">{group.name}</h3>
                <p className="text-sm text-gray-500">{group.description || "No description"}</p>
                <p className="text-xs text-gray-400">Target ward: {group.targetWard || "Unspecified"}</p>
              </div>
              <button onClick={() => messageGroup(group.id)} className="text-sm border rounded-lg px-3 py-1.5">Message Group</button>
            </div>

            <div className="grid md:grid-cols-2 gap-3 items-end">
              <div>
                <p className="text-xs text-gray-500 mb-1">Add volunteer</p>
                <select id={`select-${group.id}`} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select volunteer</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{(p.user?.name ?? `${p.contact?.firstName ?? ""} ${p.contact?.lastName ?? ""}`.trim()) || p.id}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById(`select-${group.id}`) as HTMLSelectElement | null;
                  if (el) addMember(group.id, el.value);
                }}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm"
              >
                Add to Group
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Roster ({group.members.length})</p>
              <div className="space-y-1">
                {group.members.map((m: any) => {
                  const profile = m.volunteerProfile;
                  const display = profile.user?.name ?? (`${profile.contact?.firstName ?? ""} ${profile.contact?.lastName ?? ""}`.trim() || "Volunteer");
                  return (
                    <div key={m.id} className="text-sm border rounded-lg px-3 py-2 flex items-center justify-between">
                      <span>{display}</span>
                      <span className="text-xs text-gray-500">{profile.user?.email ?? profile.contact?.email ?? profile.contact?.phone ?? "No contact"}</span>
                    </div>
                  );
                })}
                {group.members.length === 0 && <p className="text-sm text-gray-400">No members added yet.</p>}
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
