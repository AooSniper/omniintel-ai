import { GoogleGenAI } from "@google/genai";
import { Topic, ArticleContent, GroundingSource } from "../types";
import { MODEL_NAME_SCAN, MODEL_NAME_WRITER } from "../constants";

// Initialize API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Step 1: Scan the web for the top 10 trending AI topics.
 * Returns a structured list of topics.
 */
export const scanForIntelligence = async (): Promise<Topic[]> => {
  try {
    const model = MODEL_NAME_SCAN;
    
    const prompt = `
      扮演一名全能 AI 情报官。
      搜索全网，找出过去 24 小时内 **全球最热门、讨论度最高** 的 **10** 个 AI 领域动态。
      
      【搜索源扩展】：
      1. **核心技术圈**: Twitter/X (AI Influencers), Reddit (LocalLLaMA/MachineLearning), Hugging Face Papers.
      2. **科技媒体**: TechCrunch, The Verge, Wired, Medium (Towards Data Science).
      3. **中文社区**: Bilibili (硬核科技区), 微信公众号 (机器之心/量子位), 知乎, 即刻.
      4. **主流新闻**: BBC Technology, CNN Business, Bloomberg.
      
      【筛选标准】：
      - 必须包含混合类型：不仅要是新模型发布，还要包含 行业大事件、政策监管、巨头动态 (OpenAI/Google/Meta) 或 有趣的 AI 应用/Demo。
      - 必须确保内容的新鲜度（24-48小时内）。
      
      【输出格式】：
      请严格只返回一个有效的 JSON 数组字符串。
      禁止使用 Markdown 代码块，禁止包含任何解释性文字。
      
      JSON 对象结构示例：
      [
        {
          "id": "id-1",
          "title": "标题(中文)",
          "summary": "一句话概括(中文)",
          "platformTags": ["Bilibili", "TechCrunch"],
          "impactScore": 88,
          "category": "Industry News"
        }
      ]
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    let text = response.text;
    if (!text) throw new Error("No data returned from scanner");
    
    // Clean up any Markdown formatting
    text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    
    try {
      return JSON.parse(text) as Topic[];
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw text:", text);
      throw new Error("Received invalid JSON format from AI model.");
    }

  } catch (error) {
    console.error("Intelligence Scan Failed:", error);
    throw error;
  }
};

/**
 * Step 2: Generate a concise intelligence brief (300-500 words).
 * Includes Images, Data Tables, and Sources.
 */
export const generateDeepDiveReport = async (topic: Topic): Promise<ArticleContent> => {
  try {
    const writerModel = MODEL_NAME_WRITER;
    const imageModel = 'imagen-4.0-generate-001';

    // Parallel Execution: Text Report + Cover Image
    const [reportResponse, imageResponse] = await Promise.all([
      // 1. Text Report Generation
      ai.models.generateContent({
        model: writerModel,
        contents: `
          你现在是 OmniIntel 的首席技术分析师，风格冷静、客观、极客。
          请针对主题："${topic.title} - ${topic.summary}" 撰写一份 **深度技术研报**。

          【核心要求】：
          1. **篇幅控制**：300 - 500 字。
          2. **必须包含 Markdown 表格**：对比参数、测试基准(Benchmarks)或历史演变。
          3. **必须包含 [技术大神辣评] (The Guru View)**：
             - 引用或模拟行业顶级大佬（如 **Andrej Karpathy, Yann LeCun, François Chollet, Jeff Dean, Demis Hassabis** 或 Hugging Face 核心工程师）的视角。
             - **重点在于去魅 (De-hyping)**：指出架构的局限性、算力成本的真实情况、或者对“通用人工智能(AGI)”炒作的批判。
             - 观点必须硬核，涉及 Transformer 架构、Token 效率、显存瓶颈或数据污染等具体技术点。

          【文章结构】：
          # ${topic.title}
          
          ## 核心信号 (The Signal)
          [简明扼要的新闻事实，不带情绪]

          ## 深度机制与数据 (Mechanics & Data)
          [技术原理解析 + Markdown 数据表格]

          ## 技术大神辣评 (The Guru View)
          > **[大佬名字]**: [核心观点 - 必须犀利、客观]
          >
          > **[另一位专家/开发者]**: [补充或反驳观点]

          ## 战局推演 (The Landscape)
          [OmniIntel 对未来 6 个月的技术预测]

          【格式禁令】：
          - 严禁使用长横线 (----)。
          - 保持排版紧凑。
        `,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingBudget: 2048 }, 
        }
      }),

      // 2. Cover Image Generation
      ai.models.generateImages({
        model: imageModel,
        prompt: `Editorial illustration for a tech news article about: ${topic.title}. Futuristic, data-driven, high tech HUD elements, isometric view, cybernetic colors (cyan, neon purple), clean composition.`,
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9',
        },
      }).catch(err => {
        console.error("Image gen failed, skipping image", err);
        return null;
      })
    ]);

    // Process Text
    let markdown = reportResponse.text || "报告生成失败。";
    
    // --- CRITICAL: CLEANUP DASHES ---
    const lines = markdown.split('\n');
    const cleanLines = lines.filter(line => {
        const trimmed = line.trim();
        // Remove separator lines but keep table rows
        if (/^[-=*_]{3,}$/.test(trimmed) && !trimmed.includes('|')) {
            return false;
        }
        return true;
    });
    markdown = cleanLines.join('\n');
    // --------------------------------

    // Process Sources
    const groundingChunks = reportResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = groundingChunks
      .map((chunk: any) => {
        if (chunk.web) {
          return { title: chunk.web.title, uri: chunk.web.uri };
        }
        return null;
      })
      .filter((s: any) => s !== null) as GroundingSource[];
    
    const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());

    // Process Image
    let coverImageBase64: string | undefined = undefined;
    if (imageResponse && imageResponse.generatedImages?.[0]?.image?.imageBytes) {
       coverImageBase64 = imageResponse.generatedImages[0].image.imageBytes;
    }

    return {
      markdown,
      sources: uniqueSources,
      coverImageBase64
    };

  } catch (error) {
    console.error("Report Generation Failed:", error);
    throw error;
  }
};