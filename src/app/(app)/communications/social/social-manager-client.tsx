"use client";

import { useEffect, useMemo, useState } from "react";

const PLATFORMS = ["x", "facebook", "instagram", "linkedin", "tiktok", "youtube", "threads", "bluesky"];

type SocialAccount = {
  id: string;
  platform: string;
  handle: string;
  displayName: string | null;
};

type SocialPost = {
  id: string;
  title: string | null;
  content: string;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
  socialAccount: SocialAccount | null;
};

type SocialMention = {
  id: string;
  platform: string;
  content: string;
  authorHandle: string | null;
  mentionedAt: string;
  needsResponse: boolean;
  sentiment: string;
};

export default function SocialManagerClient({ campaignId }: { campaignId: string }) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [mentions, setMentions] = useState<SocialMention[]>([]);

  const [accountForm, setAccountForm] = useState({ platform: "x", handle: "", displayName: "" });
  const [postForm, setPostForm] = useState({
    socialAccountId: "",
    title: "",
    content: "",
    scheduledFor: "",
    status: "draft",
    targetPlatforms: [] as string[],
  });

  const [busy, setBusy] = useState(false);

  const publishQueue = useMemo(
    () => posts.filter((post) => ["scheduled", "approved", "pending_approval"].includes(post.status)),
    [posts]
  );

  async function loadAll() {
    const [accountRes, postRes, mentionRes] = await Promise.all([
      fetch(`/api/communications/social/accounts?campaignId=${campaignId}`),
      fetch(`/api/communications/social/posts?campaignId=${campaignId}`),
      fetch(`/api/communications/social/mentions?campaignId=${campaignId}`),
    ]);

    const accountData = await accountRes.json();
    const postData = await postRes.json();
    const mentionData = await mentionRes.json();

    setAccounts(accountData.data ?? []);
    setPosts(postData.data ?? []);
    setMentions(mentionData.data ?? []);

    if (!postForm.socialAccountId && accountData.data?.[0]?.id) {
      setPostForm((current) => ({ ...current, socialAccountId: accountData.data[0].id }));
    }
  }

  useEffect(() => {
    loadAll();
  }, [campaignId]);

  async function addAccount() {
    setBusy(true);
    try {
      await fetch("/api/communications/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, ...accountForm }),
      });
      setAccountForm({ platform: "x", handle: "", displayName: "" });
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function createPost() {
    if (!postForm.content.trim()) return;

    setBusy(true);
    try {
      await fetch("/api/communications/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          socialAccountId: postForm.socialAccountId || undefined,
          title: postForm.title,
          content: postForm.content,
          scheduledFor: postForm.scheduledFor || undefined,
          status: postForm.status,
          targetPlatforms: postForm.targetPlatforms,
        }),
      });
      setPostForm({
        socialAccountId: accounts[0]?.id || "",
        title: "",
        content: "",
        scheduledFor: "",
        status: "draft",
        targetPlatforms: [],
      });
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function updatePostStatus(id: string, status: string) {
    setBusy(true);
    try {
      await fetch(`/api/communications/social/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function resolveMention(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/communications/social/mentions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needsResponse: false, respondedAt: new Date().toISOString() }),
      });
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  function toggleTargetPlatform(platform: string) {
    setPostForm((current) => ({
      ...current,
      targetPlatforms: current.targetPlatforms.includes(platform)
        ? current.targetPlatforms.filter((item) => item !== platform)
        : [...current.targetPlatforms, platform],
    }));
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Social Media Manager</h1>
        <p className="text-sm text-slate-600 mt-1">Manage channels, queue posts, approvals, and mention response workflows.</p>
      </header>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Connected Accounts</h2>
        <div className="grid md:grid-cols-3 gap-2">
          <select
            className="border rounded-lg px-3 py-2"
            value={accountForm.platform}
            onChange={(e) => setAccountForm((current) => ({ ...current, platform: e.target.value }))}
          >
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>{platform}</option>
            ))}
          </select>
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="@handle"
            value={accountForm.handle}
            onChange={(e) => setAccountForm((current) => ({ ...current, handle: e.target.value }))}
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Display name"
            value={accountForm.displayName}
            onChange={(e) => setAccountForm((current) => ({ ...current, displayName: e.target.value }))}
          />
        </div>
        <button disabled={busy} onClick={addAccount} className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-60">
          Add Account
        </button>
        <div className="grid md:grid-cols-2 gap-3">
          {accounts.map((account) => (
            <div key={account.id} className="border rounded-lg p-3">
              <p className="text-sm font-semibold text-slate-900">{account.platform.toUpperCase()} · {account.handle}</p>
              <p className="text-xs text-slate-600">{account.displayName || "No display name"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Create Post</h2>
        <div className="grid md:grid-cols-2 gap-2">
          <select
            className="border rounded-lg px-3 py-2"
            value={postForm.socialAccountId}
            onChange={(e) => setPostForm((current) => ({ ...current, socialAccountId: e.target.value }))}
          >
            <option value="">No linked account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.platform.toUpperCase()} · {account.handle}</option>
            ))}
          </select>
          <select
            className="border rounded-lg px-3 py-2"
            value={postForm.status}
            onChange={(e) => setPostForm((current) => ({ ...current, status: e.target.value }))}
          >
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Post title"
            value={postForm.title}
            onChange={(e) => setPostForm((current) => ({ ...current, title: e.target.value }))}
          />
          <input
            className="border rounded-lg px-3 py-2"
            type="datetime-local"
            value={postForm.scheduledFor}
            onChange={(e) => setPostForm((current) => ({ ...current, scheduledFor: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PLATFORMS.map((platform) => (
            <label key={platform} className="text-xs border rounded-lg px-2 py-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={postForm.targetPlatforms.includes(platform)}
                onChange={() => toggleTargetPlatform(platform)}
              />
              {platform}
            </label>
          ))}
        </div>

        <textarea
          className="border rounded-lg px-3 py-2 w-full min-h-24"
          placeholder="Write your post"
          value={postForm.content}
          onChange={(e) => setPostForm((current) => ({ ...current, content: e.target.value }))}
        />

        <button disabled={busy} onClick={createPost} className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-60">
          Save Post
        </button>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Publishing Queue ({publishQueue.length})</h2>
        <div className="space-y-2">
          {posts.map((post) => (
            <div key={post.id} className="border rounded-lg p-3">
              <p className="text-sm font-semibold text-slate-900">{post.title || "Untitled post"}</p>
              <p className="text-xs text-slate-600">{post.status} · {post.socialAccount ? `${post.socialAccount.platform.toUpperCase()} ${post.socialAccount.handle}` : "No account"}</p>
              <p className="text-sm text-slate-700 mt-2">{post.content}</p>
              <div className="flex gap-2 mt-3">
                <button className="text-xs border rounded px-2 py-1" onClick={() => updatePostStatus(post.id, "approved")}>Approve</button>
                <button className="text-xs border rounded px-2 py-1" onClick={() => updatePostStatus(post.id, "scheduled")}>Schedule</button>
                <button className="text-xs border rounded px-2 py-1" onClick={() => updatePostStatus(post.id, "published")}>Mark Published</button>
                <button className="text-xs border rounded px-2 py-1" onClick={() => updatePostStatus(post.id, "failed")}>Mark Failed</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Mentions Requiring Response</h2>
        <div className="space-y-2">
          {mentions.filter((mention) => mention.needsResponse).map((mention) => (
            <div key={mention.id} className="border rounded-lg p-3">
              <p className="text-xs text-slate-600">{mention.platform.toUpperCase()} · {mention.authorHandle || "Unknown"} · {new Date(mention.mentionedAt).toLocaleString()}</p>
              <p className="text-sm text-slate-900 mt-1">{mention.content}</p>
              <p className="text-xs text-slate-600 mt-1">Sentiment: {mention.sentiment}</p>
              <button className="text-xs border rounded px-2 py-1 mt-2" onClick={() => resolveMention(mention.id)}>Mark Responded</button>
            </div>
          ))}
          {mentions.filter((mention) => mention.needsResponse).length === 0 && (
            <p className="text-sm text-slate-600">No unresolved mentions.</p>
          )}
        </div>
      </section>
    </div>
  );
}
