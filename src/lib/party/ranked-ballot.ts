interface RankedBallot {
  voterId: string;
  rankings: { nomineeId: string; rank: number }[];
}

interface RankedBallotResult {
  winner: string | null;
  rounds: { nomineeId: string; votes: number; eliminated: boolean }[][];
  totalBallots: number;
}

export function computeRankedBallotResult(ballots: RankedBallot[]): RankedBallotResult {
  if (ballots.length === 0) return { winner: null, rounds: [], totalBallots: 0 };

  const activeBallots = ballots.map(b => ({
    ...b,
    rankings: [...b.rankings].sort((a, c) => a.rank - c.rank),
  }));

  const allNominees = new Set<string>();
  for (const b of activeBallots) {
    for (const r of b.rankings) allNominees.add(r.nomineeId);
  }

  const eliminated = new Set<string>();
  const rounds: { nomineeId: string; votes: number; eliminated: boolean }[][] = [];
  const majority = Math.floor(activeBallots.length / 2) + 1;

  while (true) {
    // Count first-choice votes (excluding eliminated)
    const counts: Record<string, number> = {};
    for (const nId of Array.from(allNominees)) {
      if (!eliminated.has(nId)) counts[nId] = 0;
    }

    for (const ballot of activeBallots) {
      const topChoice = ballot.rankings.find(r => !eliminated.has(r.nomineeId));
      if (topChoice) counts[topChoice.nomineeId] = (counts[topChoice.nomineeId] || 0) + 1;
    }

    const round = Object.entries(counts).map(([nomineeId, votes]) => ({
      nomineeId, votes, eliminated: false,
    }));
    round.sort((a, b) => b.votes - a.votes);

    // Check for winner
    if (round.length > 0 && round[0].votes >= majority) {
      rounds.push(round);
      return { winner: round[0].nomineeId, rounds, totalBallots: ballots.length };
    }

    // Only one left
    if (round.length <= 1) {
      rounds.push(round);
      return { winner: round[0]?.nomineeId ?? null, rounds, totalBallots: ballots.length };
    }

    // Eliminate lowest
    const lowest = round[round.length - 1];
    lowest.eliminated = true;
    eliminated.add(lowest.nomineeId);
    rounds.push(round);
  }
}
