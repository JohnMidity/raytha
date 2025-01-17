﻿using MediatR;
using Raytha.Application.Common.Exceptions;
using Raytha.Application.Common.Interfaces;
using Raytha.Application.Common.Models;

namespace Raytha.Application.ContentItems.Queries;

public class GetContentItemById
{
    public record Query : GetEntityByIdInputDto, IRequest<IQueryResponseDto<ContentItemDto>>
    {
    }

    public class Handler : RequestHandler<Query, IQueryResponseDto<ContentItemDto>>
    {
        private readonly IRaythaDbJsonQueryEngine _db;
        public Handler(IRaythaDbJsonQueryEngine db)
        {
            _db = db;
        }
        protected override IQueryResponseDto<ContentItemDto> Handle(Query request)
        {
            var entity = _db.FirstOrDefault(request.Id.Guid);
            if (entity == null)
                throw new NotFoundException("Content item", request.Id);

            return new QueryResponseDto<ContentItemDto>(ContentItemDto.GetProjection(entity));
        }
    }
}
