let poll = {
  question: 'Should Poll City launch?',
  options: ['Yes', 'No'],
  votes: [0, 0]
};

module.exports = (req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Welcome to Poll City API\n');
  } else if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else if (req.url === '/poll') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(poll));
  } else if (req.url === '/vote' && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);

        if (typeof parsed.vote !== 'number') {
          throw new Error('Invalid vote format');
        }

        if (poll.votes[parsed.vote] === undefined) {
          throw new Error('Invalid vote index');
        }

        poll.votes[parsed.vote]++;

        console.log('Updated votes:', poll.votes);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'vote counted',
            votes: poll.votes
          })
        );
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: err.message
          })
        );
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
  }
};