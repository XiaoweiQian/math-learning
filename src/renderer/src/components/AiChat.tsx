import { CommentedHighlight } from '@renderer/lib/types';
import { Highlight } from "@renderer/lib/types";
import "@/assets/AiChat.css"

interface AiChatProps {
  highlights: Array<CommentedHighlight>;
}

const updateHash = (highlight: Highlight) => {
  document.location.hash = `highlight-${highlight.id}`;
};




const AiChat = ({ highlights }: AiChatProps) => {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 bg-muted/50">
      <div className="flex flex-col items-center">
        {/* You can replace this with your actual chat interface */}
        <h2 className="text-xl font-semibold mb-4">AI Chat</h2>


        {/* Highlights list */}
        {highlights && (
          <ul className="sidebar__highlights">
            {highlights.map((highlight, index) => (
              <li
                key={index}
                className="sidebar__highlight"
                onClick={() => {
                  updateHash(highlight);
                }}

              >
                <div>
                  {/* Highlight comment and text */}
                  <strong>{highlight.comment}</strong>
                  {highlight.content.text && (
                    <blockquote style={{ marginTop: "0.5rem" }}>
                      {`${highlight.content.text.slice(0, 90).trim()}…`}
                    </blockquote>
                  )}

                  {/* Highlight image */}
                  {highlight.content.image && (
                    <div
                      className="highlight__image__container"
                      style={{ marginTop: "0.5rem" }}
                    >
                      <img
                        src={highlight.content.image}
                        alt={"Screenshot"}
                        className="highlight__image"
                      />
                    </div>
                  )}
                </div>

                {/* Highlight page number */}
                <div className="highlight__location">
                  Page {highlight.position.boundingRect.pageNumber}
                </div>
              </li>
            ))}
          </ul>
        )}



      </div>
    </div>
  );
};

export default AiChat;

