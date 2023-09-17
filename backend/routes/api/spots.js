const express = require('express');
const { Spot, Review, SpotImage, User, ReviewImage, Booking, sequelize } = require('../../db/models');
const { requireAuth } = require('../../utils/auth');
const { validateSpotParams, validateReviewParams, validateSpotQueryParams } = require('./validators')
const { Op } = require("sequelize");

const router = express.Router();

// get all spots
router.get('/', validateSpotQueryParams, async (req, res) => {
    let { page, size, minLat, maxLat, minLng, maxLng, minPrice, maxPrice } = req.query
    if (!page || page > 10) page = 1
    if (!size || size > 20) size = 20

    page = +page
    size = +size

    const paginationValues = {}
    if (page > 0 && size > 0) {
        paginationValues.limit = size
        paginationValues.offset = size * (page - 1)
    }

    const where = {}
    if (minLat && maxLat) where.lat = { [Op.between]: [+minLat, +maxLat] }
    else if (minLat) where.lat = { [Op.gte]: +minLat }
    else if (maxLat) where.lat = { [Op.lte]: +maxLat }

    if (minLng && maxLng) where.lng = { [Op.between]: [+minLng, +maxLng] }
    else if (minLng) where.lng = { [Op.gte]: +minLng }
    else if (maxLng) where.lng = { [Op.lte]: +maxLng }

    if (minPrice && maxPrice) where.price = { [Op.between]: [+minPrice, +maxPrice] }
    else if (minPrice) where.price = { [Op.gte]: +minPrice }
    else if (maxPrice) where.price = { [Op.lte]: +maxPrice }

    const spots = await Spot.findAll({
        ...paginationValues,
        where,
        attributes: [
            "id",
            ["userId", "ownerId"],
            "address",
            "city",
            "state",
            "country",
            "lat",
            "lng",
            "name",
            "description",
            "price",
            "createdAt",
            "updatedAt"
        ]
    })
    const payload = []
    for (let i = 0; i < spots.length; i++) {
        const spot = spots[i]
        const spotData = spot.toJSON()
        const spotRating = await spot.getReviews({
            attributes: [
                [sequelize.fn('ROUND', sequelize.fn('AVG', sequelize.col('stars')), 1), 'avgRating']
            ],
            required: false
        })
        const spotImg = await spot.getSpotImages({
            where: { preview: true },
            attributes: [
                ['url', 'previewImage']
            ],
            required: false,
        })
        spotData.avgRating = spotRating[0].dataValues.avgRating
        if (!spotImg[0]) spotData.previewImage = null
        else spotData.previewImage = spotImg[0].dataValues['previewImage']
        payload.push(spotData)
    }
    res.json({ "Spots": payload, page, size })

});

// get all spots owned by current user
router.get('/current-user', requireAuth, async (req, res) => {
    const userId = req.user.id
    const spots = await Spot.findAll({
        where: { userId: userId },
        attributes: [
            "id",
            ["userId", "ownerId"],
            "address",
            "city",
            "state",
            "country",
            "lat",
            "lng",
            "name",
            "description",
            "price",
            "createdAt",
            "updatedAt"
        ],
    })
    const payload = []
    for (let i = 0; i < spots.length; i++) {
        const spot = spots[i]
        const spotData = spot.toJSON()
        const spotRating = await spot.getReviews({
            attributes: [
                [sequelize.fn('ROUND', sequelize.fn('AVG', sequelize.col('stars')), 1), 'avgRating']
            ],
            required: false
        })
        const spotImg = await spot.getSpotImages({
            where: { preview: true },
            attributes: [
                ['url', 'previewImage']
            ],
            required: false,
        })
        spotData.avgRating = spotRating[0].dataValues.avgRating
        if (!spotImg[0]) spotData.previewImage = null
        else spotData.previewImage = spotImg[0].dataValues['previewImage']
        payload.push(spotData)
    }
    res.json({ "Spots": payload })
    // res.json({ "Spots": spots })
});

// get details of a spot from an id
router.get('/:spotId', async (req, res) => {
    const { spotId } = req.params
    const existingSpot = await Spot.findByPk(spotId)
    if (existingSpot) {
        const spot = await Spot.findOne({
            where: { id: spotId },
            include: [
                {
                    model: SpotImage,
                    attributes: ['id', 'url', 'preview'],
                    separate: true,
                },
                {
                    model: User,
                    as: 'Owner',
                    attributes: ['id', 'firstName', 'lastName']
                }
            ],
            attributes: [
                "id",
                ["userId", "ownerId"],
                "address",
                "city",
                "state",
                "country",
                "lat",
                "lng",
                "name",
                "description",
                "price",
                "createdAt",
                "updatedAt"
            ],
        })
        console.log(spot)
        const spotData = spot.toJSON()
        console.log(spotData)
        const spotRating = await spot.getReviews({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('stars')), 'numReviews'],
                [sequelize.fn('ROUND', sequelize.fn('AVG', sequelize.col('stars')), 1), 'avgStarRating']
            ],
            required: false
        })
        console.log(spotRating)
        spotData.numReviews = spotRating[0].dataValues.numReviews
        spotData.avgStarRating = spotRating[0].dataValues.avgStarRating
        res.json({ "Spots": spotData })
    }
    if (!existingSpot) {
        res.status(404);
        return res.json({
            "message": "Spot couldn't be found",
        })
    }
});

// create a new spot
router.post('/', requireAuth, validateSpotParams, async (req, res) => {
    const userId = req.user.id
    if (userId) {
        const { address, city, state, country, lat, lng, name, description, price } = req.body
        const newSpot = Spot.build({
            userId: userId,
            address: address,
            city: city,
            state: state,
            country: country,
            lat: lat,
            lng: lng,
            name: name,
            description: description,
            price: price
        })
        await newSpot.save()
        const modifiedResult = {
            ...newSpot.get(),
            ownerId: newSpot.userId,
        }
        delete modifiedResult.userId
        res.status(201).json(modifiedResult)
    }
});

// add an image to a spot based on spot id
router.post('/:spotId/images', requireAuth, async (req, res) => {
    const currUserId = req.user.id
    const { spotId } = req.params
    const { url, preview } = req.body
    const existingSpot = await Spot.findOne({
        where: { id: spotId }
    })
    if (existingSpot) {
        if (currUserId === existingSpot.userId) {

            const newSpotImage = SpotImage.build({
                spotId: spotId,
                url: url,
                preview: preview
            })
            await newSpotImage.save()
            res.json({
                'id': newSpotImage.id,
                'url': newSpotImage.url,
                'preview': newSpotImage.preview
            })
        } else {
            res.status(403)
            return res.json({
                "message": "Forbidden"
            })
        }
    } else {
        res.status(404);
        return res.json({
            "message": "Spot couldn't be found",
        })
    }
});

// edit a spot
router.put('/:spotId', requireAuth, validateSpotParams, async (req, res) => {
    const currUserId = req.user.id
    const { spotId } = req.params
    const { address, city, state, country, lat, lng, name, description, price } = req.body
    const existingSpot = await Spot.findOne({
        where: { id: spotId },
        attributes: [
            "id",
            ["userId", "ownerId"],
            "address",
            "city",
            "state",
            "country",
            "lat",
            "lng",
            "name",
            "description",
            "price",
            "createdAt",
            "updatedAt"
        ]
    })
    if (existingSpot) {
        const existingSpotObj = existingSpot.toJSON()
        if (currUserId === existingSpotObj.ownerId) {

            if (address !== undefined) existingSpot.address = address
            if (city !== undefined) existingSpot.city = city
            if (state !== undefined) existingSpot.state = state
            if (country !== undefined) existingSpot.country = country
            if (lat !== undefined) existingSpot.lat = lat
            if (lng !== undefined) existingSpot.lng = lng
            if (name !== undefined) existingSpot.name = name
            if (description !== undefined) existingSpot.description = description
            if (price !== undefined) existingSpot.price = price

            await existingSpot.save()
            res.json(existingSpot)
        } else {
            res.status(403)
            return res.json({
                "message": "Forbidden"
            })
        }
    } else {
        res.status(404);
        return res.json({
            "message": "Spot couldn't be found",
        })
    }
});

// delete a spot
router.delete('/:spotId', requireAuth, async (req, res) => {
    const currUserId = req.user.id
    const { spotId } = req.params
    const existingSpot = await Spot.findByPk(spotId)

    if (existingSpot) {
        if (currUserId === existingSpot.userId) {
            await existingSpot.destroy()
            res.json({
                "message": "Successfully deleted"
            })
        } else {
            res.status(403)
            return res.json({
                "message": "Forbidden"
            })
        }
    } else {
        res.status(404);
        return res.json({
            "message": "Spot couldn't be found",
        })
    }
});

// get all reviews by spot id
router.get('/:spotId/reviews', async (req, res) => {
    const { spotId } = req.params
    const existingSpot = await Spot.findOne({
        where: { id: spotId }
    })
    if (existingSpot) {
        const spotReviews = await existingSpot.getReviews({
            include: [{
                model: User,
                attributes: ['id', 'firstName', 'lastName']
            },
            {
                model: ReviewImage,
                attributes: ['id', 'url'],
            }]
        })
        res.json({ "Reviews": spotReviews })
    } else {
        res.status(404);
        return res.json({
            "message": "Spot couldn't be found",
        })
    }
});

// create a review for a spot based on its id
router.post('/:spotId/reviews', requireAuth, validateReviewParams, async (req, res) => {
    const currUserId = req.user.id
    const { spotId } = req.params
    const { review, stars } = req.body
    const existingSpot = await Spot.findOne({
        where: { id: spotId }
    })
    if (existingSpot) {
        const spotReviews = await existingSpot.getReviews()

        for (let i = 0; i < spotReviews.length; i++) {
            const review = spotReviews[i].toJSON()
            if (review.userId === currUserId) {
                res.status(403);
                return res.json({
                    "message": "User already has a review for this spot",
                })
            }
        }
        if (existingSpot.userId === currUserId) {
            res.status(404);
            return res.json({
                "message": "Owner of spot cannot leave a review",
            })
        }
        const newReview = Review.build({
            userId: currUserId,
            spotId: spotId,
            review: review,
            stars: stars
        })
        await newReview.save()
        res.status(201).json(newReview)
    } else {
        res.status(404);
        return res.json({
            "message": "Spot couldn't be found",
        })
    }
});

// get all bookings for a spot by spotId
router.get('/:spotId/bookings', requireAuth, async (req, res) => {
    const currUserId = req.user.id
    const { spotId } = req.params
    const existingSpot = await Spot.findByPk(spotId)

    if (existingSpot) {
        if (existingSpot) {
            if (currUserId === existingSpot.userId) {
                const bookings = await existingSpot.getBookings({
                    include: {
                        model: User,
                        attributes: ['id', 'firstName', 'lastName']
                    }
                })
                res.json({ "Bookings": bookings })
            } else {
                const bookings = await existingSpot.getBookings({
                    attributes: ['spotId', 'startDate', 'endDate']
                })
                res.json({ "Bookings": bookings })
            }
        }
    }
    if (!existingSpot) {
        res.status(404);
        return res.json({
            "message": "Spot couldn't be found",
        })
    }
});

// create booking from spot based on spotId
router.post('/:spotId/bookings', requireAuth, async (req, res) => {
    const currUserId = req.user.id
    const { spotId } = req.params
    const { startDate, endDate } = req.body
    const existingSpot = await Spot.findByPk(spotId)

    if (existingSpot) {
        if (currUserId !== existingSpot.userId) {
            if (endDate < startDate) {
                res.status(400)
                return res.json({
                    "message": "Bad Request",
                    "errors": {
                        "endDate": "endDate cannot be on or before startDate"
                    }
                })
            }
            const overlappingBookings = await existingSpot.getBookings({
                where: {
                    startDate: { [Op.lte]: endDate },
                    endDate: { [Op.gte]: startDate }
                }
            })
            if (overlappingBookings.length > 0) {
                res.status(403);
                return res.json(
                    {
                        "message": "Sorry, this spot is already booked for the specified dates",
                        "errors": {
                            "startDate": "Start date conflicts with an existing booking",
                            "endDate": "End date conflicts with an existing booking"
                        }
                    }
                )
            }
            const newBooking = Booking.build({
                spotId: spotId,
                userId: currUserId,
                startDate: startDate,
                endDate: endDate
            })
            await newBooking.save()
            res.json(newBooking)
        } else {
            res.status(403)
            return res.json({
                "message": "Forbidden"
            })
        }
    } else {
        res.status(404);
        return res.json({
            "message": "Spot couldn't be found",
        })
    }
});

// delete spot image
router.delete('/:spotId/images/:imageId', requireAuth, async (req, res) => {
    const currUserId = req.user.id
    const { spotId, imageId } = req.params
    const existingSpot = await Spot.findByPk(spotId)
    if (existingSpot) {
        const existingSpotImages = await existingSpot.getSpotImages({ where: { id: imageId } })
        const existingSpotImage = existingSpotImages[0]
        if (currUserId === existingSpot.userId) {
            await existingSpotImage.destroy()
            res.json({
                "message": "Successfully deleted"
            })
        } else {
            res.status(403)
            return res.json({
                "message": "Forbidden"
            })
        }
    } else {
        res.status(404);
        return res.json({
            "message": "Spot Image couldn't be found"
        })
    }
});


module.exports = router;
