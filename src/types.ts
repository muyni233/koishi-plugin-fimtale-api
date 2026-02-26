

declare module 'koishi' {
    interface Tables {
        fimtale_subs: FimtaleSub
    }
}

export interface FimtaleSub {
    id: number
    cid: string
    threadId: string
    lastCount: number
    lastCheck: number
}

export interface TopicInfo {
    ID: number
    Title: string
    UserName: string
    Content: string
    DateCreated: number
    Views: number
    Comments: number
    Background: string | null
    WordCount?: number
    Upvotes?: number
    Downvotes?: number
    Followers?: number
    HighPraise?: number
    IsChapter?: boolean
    Tags: {
        Type?: string
        Rating?: string
        OtherTags?: string[]
        [key: string]: any
    }
}

export interface ApiResponse {
    Status: number
    TopicInfo?: TopicInfo
    ParentInfo?: TopicInfo
    Menu?: any[]
    ErrorMessage?: string
}

export interface SearchResult {
    id: string
    title: string
    author: string
    cover?: string
    tags: string[]
    status: string
    stats: {
        views: string
        comments: string
        likes: string
        words: string
        followers?: string
    }
    updateTime: string
}

export interface FetchResult {
    valid: boolean
    data?: TopicInfo
    parent?: TopicInfo
    menu?: any[]
    msg?: string
}
