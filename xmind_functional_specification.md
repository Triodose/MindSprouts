## 3. 核心功能模組

### 3.1 心智圖繪製與多結構混搭 (Mind Mapping & Structures)
XMind 提供了 9 種核心思維結構，並允許在**同一個畫布中的不同分支**混搭使用不同的結構。

*   **心智圖 (Mind Map)：** 從中心向四周發散的經典放射狀結構。
*   **邏輯圖 (Logic Chart)：** 左至右或右至左的單向思維導向圖。
*   **組織結構圖 (Org Chart)：** 由上至下的階層樹狀結構，適用於組織架構或檔案目錄。
*   **樹狀圖 (Tree Chart)：** 垂直排列的樹狀分支結構。
*   **括號圖 (Brace Map)：** 由大括號組成的層次劃分圖，適合展示整體與部分的關係。
*   **時間軸 (Timeline)：** 水平或垂直的順序事件軸，用於專案里程碑與歷史事件。
*   **魚骨圖 (Fishbone Diagram)：** 骨架結構，專門用於因果分析與問題根源追蹤。

> [!NOTE]
> **結構混搭功能：** 使用者可以選取任一分支（Branch/Topic），並在其 Format 面板中將該分支單獨設定為不同於主圖的結構（例如：主圖為經典心智圖，但某一子分支採用魚骨圖進行原因分析，另一子分支採用矩陣圖進行方案對比）。

### 3.2 大綱模式 (Outliner)
*   **一鍵切換：** 提供心智圖與線性大綱的即時雙向切換。
*   **階層管理：** 支援以直觀的條列清單（List）展示結構，便於文字創作者組織段落。
*   **同步編輯：** 在大綱模式下新增、刪除或拖曳調整層級，心智圖結構會同步更新。
---

## 5. 視覺自訂與多媒體標記

為提升心智圖的易讀性與視覺吸引力，XMind 支援豐富的視覺自訂工具：

*   **豐富的插圖與貼紙：** 內建大量高品質向量插圖與功能性標記（如：1-9優先級標籤、進度圖示、情感表情等）。
*   **節點資訊與關聯：**
    *   **關聯線 (Relationship)：** 用虛線連接兩個無直接層級關係的節點，並可加上標籤說明。
    *   **外框 (Boundary)：** 將多個相關聯的子節點框在一起，並賦予外框標題。
    *   **概要 (Summary)：** 為多個選定的分支做一個總結性的子節點。
*   **多媒體與附加檔案：** 支援插入超連結、語音備忘錄、本地檔案附件、文字標籤（Label）與詳細備註（Note）。
*   **LaTeX 數學公式：** 支援直接輸入 LaTeX 語法，完美渲染數學、物理等學術公式，滿足科研與教育使用者需求。

---

## 6. 資料匯入與匯出規格

XMind 具備極佳的開放性與相容性，支援多種文件格式的雙向流轉：

```mermaid
graph TD
    subgraph 匯入源 (Import)
        Word[Word .docx]
        MD[Markdown .md]
        OPML[OPML 大綱]
        Legacy[舊版 XMind/MindManager]
    end

    subgraph XMind核心 [XMind 編輯器]
        Core[心智圖 / 大綱]
    end

    subgraph 匯出格式 (Export)
        Img[高解析度圖片 PNG/JPEG/SVG]
        Doc[Office文件 Word/PPT/Excel]
        PDF[向量 PDF]
        Structured[OPML/Markdown/Text]
    end

    Word --> Core
    MD --> Core
    OPML --> Core
    Legacy --> Core

    Core --> Img
    Core --> Doc
    Core --> PDF
    Core --> Structured
```

### 6.1 匯入格式支援
*   **心智圖格式：** MindManager (`.mmap`), FreeMind (`.mm`), MindNode, EdrawMind, Lighten。
*   **文書與大綱：** Microsoft Word (`.docx`), Markdown (`.md`), OPML, TextBundle。
*   **舊版相容：** 支援直接匯入與升級舊版 XMind 檔案。

### 6.2 匯出格式支援
*   **影像檔：** PNG, JPEG, SVG（向量圖，便於放大列印不失真）。支援 2x/3x 解析度放大匯出，以及單獨匯出選定分支。
*   **文書辦公：** Microsoft Word (`.docx`), Microsoft PowerPoint (`.pptx`), Microsoft Excel (`.xlsx`), PDF。
*   **結構化文字：** Markdown (`.md`), OPML, HTML, Text (`.txt`)。
