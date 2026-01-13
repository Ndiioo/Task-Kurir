
import React from 'react';
import { MOCK_TICKER_TEXT } from '../constants';

const RunningFeed: React.FC = () => {
  return (
    <div className="bg-blue-600 text-white py-1.5 overflow-hidden sticky top-0 z-50 shadow-sm border-b border-blue-700">
      <div className="animate-marquee whitespace-nowrap text-sm font-medium tracking-wide">
        {MOCK_TICKER_TEXT} &nbsp;&bull;&nbsp; {MOCK_TICKER_TEXT} &nbsp;&bull;&nbsp; {MOCK_TICKER_TEXT}
      </div>
    </div>
  );
};

export default RunningFeed;
